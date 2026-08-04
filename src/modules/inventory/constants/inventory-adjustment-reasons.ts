export const INVENTORY_ADJUSTMENT_REASONS = [
  "initial_stock",
  "manual_correction",
  "damaged_products",
  "supplier_adjustment",
  "inventory_count",
  "order_reserved",
  "order_release",
  "order_completed",
] as const;

export type AdjustmentReason = (typeof INVENTORY_ADJUSTMENT_REASONS)[number];
