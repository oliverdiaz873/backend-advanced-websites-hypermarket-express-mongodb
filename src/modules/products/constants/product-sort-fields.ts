export const PRODUCT_SORT_FIELDS = ["name", "price", "createdAt", "updatedAt"] as const;

export type ProductSortField = (typeof PRODUCT_SORT_FIELDS)[number];