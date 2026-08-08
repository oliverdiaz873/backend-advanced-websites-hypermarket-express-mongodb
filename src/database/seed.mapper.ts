import type { IProduct } from "../modules/products/models/product.model";
import productsData from "../modules/products/data/products.data";
import { productsI18nEn } from "../modules/products/data/products.i18n.data";
import categoriesData from "../modules/categories/data/categories.data";

export const buildSubcategoryMap = (): Record<string, string> => {
  const map: Record<string, string> = {};
  for (const category of categoriesData) {
    for (const sub of category.subcategories) {
      map[sub.slug] = sub.name;
    }
  }
  return map;
};

export const mapProduct = (
  raw: (typeof productsData)[number],
  subcategoryNames: Record<string, string>
): IProduct => {
  const en = productsI18nEn[raw.id];
  return {
    _id: raw.id,
    sku: `sku-${raw.id}`,
    name: raw.name,
    description: `Detalle de ${raw.name}`,
    translations: en ? { en } : undefined,
    price: raw.price,
    image: raw.image,
    categoryId: raw.category,
    category: {
      name: subcategoryNames[raw.category] || "Otros",
      slug: raw.category,
    },
    unit: raw.unit || undefined,
    unitQuantity: raw.unitQuantity || undefined,
    status: "active",
    isAvailable: true,
  };
};