import { randomUUID } from "crypto";
import * as productRepository from "../repositories/product.repository";
import * as categoryRepository from "../../categories/repositories/category.repository";
import * as brandRepository from "../../brands/repositories/brand.repository";
import * as inventoryRepository from "../../inventory/repositories/inventory.repository";
import * as auditService from "../../../modules/audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { ConflictError } from "../../../shared/errors/conflict.error";
import { slugify } from "../../../shared/utils/slug";
import type { Product, ProductStatus } from "../../../types";

export interface CreateProductInput {
  name: string;
  price: number;
  image: string;
  categoryId: string;
  sku?: string;
  description?: string;
  brandId?: string;
  unit?: string;
  unitQuantity?: number;
  status?: ProductStatus;
  isAvailable?: boolean;
  stock?: number;
  minStock?: number;
}

export interface UpdateProductInput {
  name?: string;
  price?: number;
  image?: string;
  categoryId?: string;
  sku?: string;
  description?: string;
  brandId?: string | null;
  unit?: string;
  unitQuantity?: number;
  status?: ProductStatus;
  isAvailable?: boolean;
}

export const getAll = async (): Promise<Product[]> => {
  return productRepository.findAll();
};

export const getById = async (id: string): Promise<Product> => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return product;
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

export const create = async (data: CreateProductInput, actorId?: string): Promise<Product> => {
  return auditService.runAudited(
    { userId: actorId, action: "CREATE_PRODUCT", resource: "product" },
    async () => {
      if (!data.name || !data.name.trim()) {
        throw new InvalidDataError("Name is required");
      }
      if (data.price === undefined || !Number.isFinite(data.price) || data.price < 0) {
        throw new InvalidDataError("Price must be a non-negative number");
      }
      if (!data.image || !data.image.trim()) {
        throw new InvalidDataError("Image is required");
      }
      if (!data.categoryId) {
        throw new InvalidDataError("categoryId is required");
      }

      const category = await resolveCategoryEmbed(data.categoryId);
      const brand = data.brandId ? await resolveBrandEmbed(data.brandId) : null;

      const sku = data.sku && data.sku.trim() ? data.sku.trim() : `sku-${slugify(data.name) || "product"}-${randomUUID().slice(0, 6)}`;
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
        image: data.image,
        categoryId: data.categoryId,
        category,
        brandId: brand ? data.brandId : undefined,
        brand: brand ?? undefined,
        unit: data.unit,
        unitQuantity: data.unitQuantity,
        status: data.status ?? "active",
        isAvailable: data.isAvailable ?? true,
      });

      await inventoryRepository.create({
        productId: product.id,
        stock: data.stock,
        minStock: data.minStock,
      });

      return product;
    },
    (result) => result.id
  );
};

export const updateById = async (id: string, data: UpdateProductInput, actorId?: string): Promise<Product> => {
  return auditService.runAudited(
    { userId: actorId, action: "UPDATE_PRODUCT", resource: "product", resourceId: id },
    async () => {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Product not found");
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };

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
      if (data.image !== undefined) {
        if (!data.image.trim()) {
          throw new InvalidDataError("Image cannot be empty");
        }
        updates.image = data.image;
      }
      if (data.description !== undefined) updates.description = data.description;
      if (data.unit !== undefined) updates.unit = data.unit;
      if (data.unitQuantity !== undefined) updates.unitQuantity = data.unitQuantity;
      if (data.status !== undefined) updates.status = data.status;
      if (data.isAvailable !== undefined) updates.isAvailable = data.isAvailable;

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

      const unset: string[] = [];
      if (data.brandId !== undefined) {
        if (data.brandId === null) {
          unset.push("brandId", "brand");
        } else {
          const brand = await resolveBrandEmbed(data.brandId);
          updates.brandId = data.brandId;
          updates.brand = brand;
        }
      }

      const updated = await productRepository.updateById(id, updates, { unset });
      if (!updated) {
        throw new NotFoundError("Product not found");
      }
      return updated;
    }
  );
};

export const remove = async (id: string, actorId?: string): Promise<void> => {
  return auditService.runAudited(
    { userId: actorId, action: "DELETE_PRODUCT", resource: "product", resourceId: id },
    async () => {
      const existing = await productRepository.findById(id);
      if (!existing) {
        throw new NotFoundError("Product not found");
      }

      await productRepository.deleteById(id);
      await inventoryRepository.deleteByProductId(id);
    }
  );
};
