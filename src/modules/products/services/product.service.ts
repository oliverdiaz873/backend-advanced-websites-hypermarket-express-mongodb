import { randomUUID } from "crypto";
import * as productRepository from "../repositories/product.repository";
import * as categoryRepository from "../../categories/repositories/category.repository";
import * as brandRepository from "../../brands/repositories/brand.repository";
import * as inventoryService from "../../inventory/services/inventory.service";
import * as auditService from "../../../modules/audit/services/audit.service";
import { getStorageProvider } from "../../../shared/storage/storage.factory";
import { isSafeStorageKey } from "../../../shared/storage/uploads.constants";
import { logger } from "../../../shared/logger/logger";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { ConflictError } from "../../../shared/errors/conflict.error";
import { slugify } from "../../../shared/utils/slug";
import { PRODUCT_SORT_FIELDS, ProductSortField } from "../constants/product-sort-fields";
import {
  toPublicProduct,
  toAdminProduct,
  normalizeLang,
  isPubliclyVisible,
} from "../presenters/product.presenter";
import type { PublicProduct, AdminProduct } from "../presenters/product.presenter";
import type { PaginationMeta, Product, ProductStatus, ProductTranslations } from "../../../types";

export type { PublicProduct, Lang } from "../presenters/product.presenter";

export interface CreateProductInput {
  name: string;
  price: number;
  categoryId: string;
  sku?: string;
  description?: string;
  brandId?: string;
  unit?: string;
  unitQuantity?: number;
  translations?: ProductTranslations;
  stock?: number;
  minStock?: number;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  description?: string;
  image?: string;
  imageKey?: string;
  imageThumbnailKey?: string;
  translations?: ProductTranslationsPatch;
  categoryId?: string;
  sku?: string;
  brandId?: string | null;
  unit?: string;
  unitQuantity?: number;
  status?: ProductStatus;
  isAvailable?: boolean;
}

/** Patch de traducciones administrativas: solo `en`, con campos opcionales para merge. */
export interface ProductTranslationsPatch {
  en?: { name?: string; description?: string };
}

const TRANSLATION_LANGS = ["en"] as const;

/**
 * Validación del contrato histórico de creación (es + en). F4 no redefine el
 * POST /api/products: ambos idiomas pueden crearse; el modelo EN-only es solo
 * para la edición administrativa (`PATCH /api/admin/products/:id`).
 */
const validateCreateTranslations = (translations: ProductTranslations): void => {
  for (const lang of ["es", "en"] as const) {
    const entry = translations[lang];
    if (entry === undefined) continue;
    if (!entry.name || !entry.name.trim()) {
      throw new InvalidDataError(`Translation for ${lang} requires a name`);
    }
  }
};

/** Validación del parche administrativo EN-only usado por el Dashboard. */
const validateTranslationsPatch = (translations: ProductTranslationsPatch): void => {
  const unknown = Object.keys(translations).filter((lang) => !TRANSLATION_LANGS.includes(lang as never));
  if (unknown.length > 0) {
    throw new InvalidDataError(`Unsupported translation language(s): ${unknown.join(", ")}`);
  }
  const en = translations.en;
  if (en !== undefined) {
    if (en.name !== undefined && !en.name.trim()) {
      throw new InvalidDataError("Translation for en requires a name");
    }
    if (en.description !== undefined && typeof en.description !== "string") {
      throw new InvalidDataError("Translation description must be a string");
    }
  }
};

export const getAll = async (lang?: unknown): Promise<PublicProduct[]> => {
  const products = await productRepository.findAll();
  return products
    .filter((product) => isPubliclyVisible(product))
    .map((product) => toPublicProduct(product, normalizeLang(lang)));
};

export const getById = async (id: string, rawLang?: unknown): Promise<PublicProduct> => {
  const product = await productRepository.findById(id);
  if (!product || !isPubliclyVisible(product)) {
    throw new NotFoundError("Product not found");
  }
  return toPublicProduct(product, normalizeLang(rawLang));
};

const resolveCategoryEmbed = async (categoryId: string): Promise<{ name: string; slug: string }> => {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return { name: category.name, slug: category.slug };
};

const resolveBrandEmbed = async (brandId: string): Promise<{ name: string; slug: string } | null> => {
  const brand = await brandRepository.findById(brandId);
  if (!brand) {
    throw new NotFoundError("Brand not found");
  }
  return { name: brand.name, slug: brand.slug };
};

export const create = async (data: CreateProductInput, actorId?: string): Promise<PublicProduct> => {
  const product = await auditService.runAudited(
    { userId: actorId, action: "CREATE_PRODUCT", resource: "product" },
    async () => {
      if (!data.name || !data.name.trim()) {
        throw new InvalidDataError("Name is required");
      }
      if (data.price === undefined || !Number.isFinite(data.price) || data.price < 0) {
        throw new InvalidDataError("Price must be a non-negative number");
      }
      if (!data.categoryId) {
        throw new InvalidDataError("categoryId is required");
      }
      if (data.translations) {
        validateCreateTranslations(data.translations);
      }

      const category = await resolveCategoryEmbed(data.categoryId);
      const brand = data.brandId ? await resolveBrandEmbed(data.brandId) : null;

      const sku =
        data.sku && data.sku.trim()
          ? data.sku.trim()
          : `sku-${slugify(data.name) || "product"}-${randomUUID().slice(0, 6)}`;
      const existingSku = await productRepository.findBySku(sku);
      if (existingSku) {
        throw new ConflictError(`Product sku already exists: ${sku}`);
      }

      const product = await productRepository.create({
        _id: randomUUID(),
        sku,
        name: data.name.trim(),
        description: data.description,
        price: data.price,
        categoryId: data.categoryId,
        category,
        brandId: brand ? data.brandId : undefined,
        brand: brand ?? undefined,
        unit: data.unit,
        unitQuantity: data.unitQuantity,
        translations: data.translations,
        status: "inactive",
        isAvailable: false,
      });

      await inventoryService.createForProduct({
        productId: product.id,
        stock: data.stock,
        minStock: data.minStock,
      });

      return product;
    },
    (result) => result.id
  );
  return toPublicProduct(product);
};

/**
 * Confirma una imagen subida (flujo F1): valida que la key sea segura, que
 * pertenezca a este producto y que el objeto exista en storage; prepara el
 * update de Mongo. La imagen antigua se borra DESPUÉS de que Mongo confirme.
 */
const applyImageKey = async (
  product: Product,
  imageKey: string,
  updates: Record<string, unknown>
): Promise<string | undefined> => {
  if (typeof imageKey !== "string" || !isSafeStorageKey(imageKey)) {
    throw new InvalidDataError("Invalid imageKey");
  }
  if (!imageKey.startsWith(`products/${product.id}/`)) {
    throw new InvalidDataError("imageKey does not belong to this product");
  }

  const provider = getStorageProvider();
  const inspection = await provider.inspectImage(imageKey);
  if (!inspection.exists) {
    throw new NotFoundError("Image not found in storage");
  }
  if (!inspection.validContentType) {
    throw new InvalidDataError("Uploaded file is not a supported image");
  }

  updates.imageKey = imageKey;
  updates.image = provider.getPublicUrl(imageKey);

  return product.imageKey && product.imageKey !== imageKey ? product.imageKey : undefined;
};

const mergeTranslations = (
  existing: ProductTranslations | undefined,
  patch: ProductTranslationsPatch
): ProductTranslations => {
  const merged: ProductTranslations = { ...existing };
  const name = patch.en?.name ?? merged.en?.name;
  if (name === undefined || !name.trim()) {
    throw new InvalidDataError("Translation for en requires a name");
  }
  merged.en = {
    name,
    description: patch.en?.description ?? merged.en?.description,
  };
  return merged;
};

const performUpdate = async (id: string, data: UpdateProductInput, actorId?: string): Promise<Product> =>
  auditService.runAudited(
    { userId: actorId, action: "UPDATE_PRODUCT", resource: "product", resourceId: id },
    async () => {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Product not found");
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const unset: string[] = [];
      let replacedImageKey: string | undefined;

      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new InvalidDataError("Name cannot be empty");
        }
        updates.name = data.name.trim();
      }
      if (data.price !== undefined) {
        if (!Number.isFinite(data.price) || data.price < 0) {
          throw new InvalidDataError("Price must be a non-negative number");
        }
        updates.price = data.price;
      }
      if (data.description !== undefined) updates.description = data.description;
      if (data.unit !== undefined) updates.unit = data.unit;
      if (data.unitQuantity !== undefined) updates.unitQuantity = data.unitQuantity;
      if (data.status !== undefined) updates.status = data.status;
      if (data.isAvailable !== undefined) updates.isAvailable = data.isAvailable;

      if (data.image !== undefined) {
        if (typeof data.image !== "string" || !data.image.trim()) {
          throw new InvalidDataError("Image cannot be empty");
        }
        updates.image = data.image;
      }

      if (data.imageKey !== undefined) {
        replacedImageKey = await applyImageKey(existing, data.imageKey, updates);
      }
      if (data.imageThumbnailKey !== undefined) {
        const thumbnailKey = data.imageThumbnailKey;
        if (typeof thumbnailKey !== "string" || !isSafeStorageKey(thumbnailKey) || !thumbnailKey.startsWith(`products/${id}/`)) {
          throw new InvalidDataError("Invalid imageThumbnailKey");
        }
        updates.imageThumbnailKey = thumbnailKey;
      }

      if (data.translations !== undefined) {
        validateTranslationsPatch(data.translations);
        updates.translations = mergeTranslations(existing.translations, data.translations);
      }

      if (data.sku !== undefined && data.sku.trim() && data.sku.trim() !== existing.sku) {
        const sku = data.sku.trim();
        const dup = await productRepository.findBySku(sku);
        if (dup && dup.id !== id) {
          throw new ConflictError(`Product sku already exists: ${sku}`);
        }
        updates.sku = sku;
      }

      if (data.categoryId !== undefined) {
        const category = await resolveCategoryEmbed(data.categoryId);
        updates.categoryId = data.categoryId;
        updates.category = category;
      }

      if (data.brandId !== undefined) {
        if (data.brandId === null) {
          unset.push("brandId", "brand");
        } else {
          const brand = await resolveBrandEmbed(data.brandId);
          updates.brandId = data.brandId;
          updates.brand = brand;
        }
      }

      const result = await productRepository.updateById(id, updates, { unset });
      if (!result) {
        throw new NotFoundError("Product not found");
      }

      if (replacedImageKey) {
        try {
          await getStorageProvider().deleteObject(replacedImageKey);
        } catch (error) {
          logger.warn("Failed to delete replaced product image", {
            imageKey: replacedImageKey,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return result;
    }
  );

export const updateById = async (id: string, data: UpdateProductInput, actorId?: string): Promise<PublicProduct> => {
  const updated = await performUpdate(id, data, actorId);
  return toPublicProduct(updated);
};

export const remove = async (id: string, actorId?: string): Promise<void> => {
  await auditService.runAudited(
    { userId: actorId, action: "DELETE_PRODUCT", resource: "product", resourceId: id },
    async () => {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Product not found");
      }

      await productRepository.deleteById(id);
      await inventoryService.removeByProductId(id);

      try {
        await getStorageProvider().deletePrefix(`products/${id}/`);
      } catch (error) {
        logger.warn("Failed to delete product image prefix", {
          productId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

const refineSortBy = (value: unknown): ProductSortField | undefined => {
  if (typeof value === "string" && (PRODUCT_SORT_FIELDS as readonly string[]).includes(value)) {
    return value as ProductSortField;
  }
  return undefined;
};

export const getPage = async (
  query: Record<string, unknown>
): Promise<{ data: PublicProduct[]; pagination: PaginationMeta }> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const sortBy = refineSortBy(query.sortBy);
  const lang = normalizeLang(query.lang);

  if (query.status === "inactive") {
    return { data: [], pagination: { page, limit, total: 0, pages: 1 } };
  }

  const result = await productRepository.findPage({
    page,
    limit,
    q: typeof query.q === "string" ? query.q : undefined,
    category: typeof query.category === "string" ? query.category : undefined,
    brand: typeof query.brand === "string" ? query.brand : undefined,
    status: "active",
    isAvailable: true,
    sortBy,
    sortOrder,
  });

  return {
    data: result.items.map((product) => toPublicProduct(product, lang)),
    pagination: result.pagination,
  };
};

export const getAdminById = async (id: string): Promise<AdminProduct> => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return toAdminProduct(product);
};

export const getAdminPage = async (
  query: Record<string, unknown>
): Promise<{ data: AdminProduct[]; pagination: PaginationMeta }> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const sortBy = refineSortBy(query.sortBy);
  const status = query.status === "inactive" ? "inactive" : query.status === "active" ? "active" : undefined;

  const result = await productRepository.findPage({
    page,
    limit,
    q: typeof query.q === "string" ? query.q : undefined,
    category: typeof query.category === "string" ? query.category : undefined,
    brand: typeof query.brand === "string" ? query.brand : undefined,
    status,
    isAvailable: query.isAvailable === "true" ? true : undefined,
    sortBy,
    sortOrder,
  });

  return {
    data: result.items.map((product) => toAdminProduct(product)),
    pagination: result.pagination,
  };
};

export const updateAdminById = async (
  id: string,
  data: UpdateProductInput,
  actorId?: string
): Promise<AdminProduct> => {
  const updated = await performUpdate(id, data, actorId);
  return toAdminProduct(updated);
};