export const INVENTORY_MOVEMENT_TYPES = [
  "increase",
  "decrease",
  "set",
  "min_stock_change",
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];
