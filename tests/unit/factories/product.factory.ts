import type { Product } from "../../../src/types";

export const PRODUCT_ID = "64b0000000000000000000a1";

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: PRODUCT_ID,
  sku: "SKU-001",
  name: "Arroz 1kg",
  description: "Arroz blanco premium",
  price: 89.5,
  image: "https://example.com/arroz.png",
  categoryId: "64b0000000000000000000c1",
  category: { name: "Granos", slug: "granos" },
  brandId: "64b0000000000000000000b1",
  brand: { name: "MarcaX", slug: "marcax" },
  unit: "kg",
  unitQuantity: 1,
  status: "active",
  isAvailable: true,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
