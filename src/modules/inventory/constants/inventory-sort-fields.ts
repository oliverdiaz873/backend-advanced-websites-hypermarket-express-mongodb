export const INVENTORY_SORT_FIELDS = ["stock", "minStock", "updatedAt", "createdAt"] as const;

export type InventorySortField = (typeof INVENTORY_SORT_FIELDS)[number];
