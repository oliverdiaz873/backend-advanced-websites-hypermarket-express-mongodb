import { getStorageProvider } from "../../../shared/storage/storage.factory";
import { logger } from "../../../shared/logger/logger";
import type { Product, ProductStatus } from "../../../types";

export type Lang = "es" | "en" | undefined;

/** Producto tal como lo consume la API pública: sin claves internas ni traducciones. */
export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  image: string | null;
  categoryId: string;
  category: { name: string; slug: string };
  brandId?: string;
  brand?: { name: string; slug: string };
  unit?: string;
  unitQuantity?: number;
  status: ProductStatus;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const normalizeLang = (lang: unknown): Lang => (lang === "es" || lang === "en" ? lang : undefined);

/** Un producto es público solo si cumple AMBOS ejes: lifecycle `active` y disponibilidad real. */
export const isPubliclyVisible = (product: Product): boolean =>
  product.status === "active" && product.isAvailable === true;

const cacheBust = (url: string, version?: Date): string => {
  if (!version) return url;
  const prefix = url.includes("?") ? "&" : "?";
  return `${url}${prefix}v=${encodeURIComponent(version.toISOString())}`;
};

const resolvePublicImage = (product: Product): string | null => {
  if (product.imageKey) {
    try {
      return cacheBust(getStorageProvider().getPublicUrl(product.imageKey), product.updatedAt);
    } catch {
      logger.warn("Failed to resolve public image URL", { imageKey: product.imageKey });
      return null;
    }
  }
  return product.image ?? null;
};

const resolveTranslatedName = (product: Product, lang?: Lang): string =>
  lang && product.translations?.[lang]?.name ? product.translations[lang].name : product.name;

const resolveTranslatedDescription = (product: Product, lang: Lang): string | undefined => {
  if (lang && product.translations?.[lang]?.description !== undefined) {
    return product.translations[lang].description;
  }
  return product.description;
};

export const toPublicProduct = (product: Product, lang?: Lang): PublicProduct => ({
  id: product.id,
  sku: product.sku,
  name: resolveTranslatedName(product, lang),
  description: resolveTranslatedDescription(product, lang),
  price: product.price,
  image: resolvePublicImage(product),
  categoryId: product.categoryId,
  category: product.category,
  brandId: product.brandId,
  brand: product.brand,
  unit: product.unit,
  unitQuantity: product.unitQuantity,
  status: product.status,
  isAvailable: product.isAvailable,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});