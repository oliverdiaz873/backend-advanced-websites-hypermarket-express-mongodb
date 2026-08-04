export const INVENTORY_ADJUSTMENT_REASONS = [
  "initial_stock",
  "manual_correction",
  "damaged_products",
  "supplier_adjustment",
  "inventory_count",
] as const;

export type AdjustmentReason = (typeof INVENTORY_ADJUSTMENT_REASONS)[number];
