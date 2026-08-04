export const INVENTORY_MOVEMENT_TYPES = [
  "increase",
  "decrease",
  "set",
  "min_stock_change",
  "reserve",
  "release_reservation",
  "complete_sale",
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];
