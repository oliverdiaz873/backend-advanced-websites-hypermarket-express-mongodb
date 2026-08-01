import type { Category } from "../../../src/types";

export const CATEGORY_ID = "cat_bebidas";

export const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: CATEGORY_ID,
  name: "Bebidas",
  slug: "bebidas",
  subcategories: [{ name: "Gaseosas", slug: "gaseosas" }],
  ...overrides,
});
