export const ORDER_SORT_FIELDS = ["createdAt", "updatedAt", "subtotal", "status"] as const;

export type OrderSortField = (typeof ORDER_SORT_FIELDS)[number];
