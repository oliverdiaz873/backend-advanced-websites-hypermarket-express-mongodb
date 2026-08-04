import type { InventoryMovement } from "../../../src/types";
import { PRODUCT_ID } from "./product.factory";
import { INVENTORY_ID } from "./inventory.factory";

export const MOVEMENT_ID = "64b0000000000000000000e1";

export const makeMovement = (overrides: Partial<InventoryMovement> = {}): InventoryMovement => ({
  id: MOVEMENT_ID,
  inventoryId: INVENTORY_ID,
  productId: PRODUCT_ID,
  type: "increase",
  quantity: 10,
  previousStock: 10,
  newStock: 20,
  previousReservedStock: 0,
  newReservedStock: 0,
  reason: "supplier_adjustment",
  createdBy: "64b0000000000000000000f1",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
