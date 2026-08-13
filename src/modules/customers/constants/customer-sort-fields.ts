export const CUSTOMER_SORT_FIELDS = ["name", "email", "createdAt"] as const;

export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];
