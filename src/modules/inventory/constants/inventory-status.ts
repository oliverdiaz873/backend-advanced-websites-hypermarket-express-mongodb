export const INVENTORY_STATUSES = ["out-of-stock", "low-stock", "ok"] as const;

export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
