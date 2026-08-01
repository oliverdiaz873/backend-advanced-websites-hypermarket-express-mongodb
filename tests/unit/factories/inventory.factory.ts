import type { Inventory } from "../../../src/types";
import { PRODUCT_ID } from "./product.factory";

export const INVENTORY_ID = "64b0000000000000000000d1";

export const makeInventory = (overrides: Partial<Inventory> = {}): Inventory => ({
  id: INVENTORY_ID,
  productId: PRODUCT_ID,
  stock: 50,
  reservedStock: 0,
  availableStock: 50,
  minStock: 10,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
