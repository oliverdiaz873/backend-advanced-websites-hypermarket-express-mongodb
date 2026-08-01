import { ProductModel } from "../../../src/modules/products/models/product.model";
import type { Product } from "../../../src/types";

const uniqueSuffix = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createTestProduct = async (overrides: Partial<Product> = {}): Promise<Product> => {
  const { id, ...rest } = overrides;
  const suffix = uniqueSuffix();
  const product = await ProductModel.create({
    _id: id ?? `prod_${suffix}`,
    sku: `SKU-${suffix}`,
    name: "Arroz 1kg",
    description: "Arroz blanco premium",
    price: 89.5,
    image: "https://example.com/arroz.png",
    categoryId: "cat_granos",
    category: { name: "Granos", slug: "granos" },
    status: "active",
    isAvailable: true,
    ...rest,
  });
  return product.toJSON() as unknown as Product;
};
