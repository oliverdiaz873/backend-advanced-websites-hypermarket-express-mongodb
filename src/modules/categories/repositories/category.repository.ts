import categories from "../data/categories.data";
import type { Category } from "../../../types";

export const findAll = (): Category[] => {
  return categories;
};

export const findById = (id: string): Category | null => {
  return categories.find((c) => c.id === id) || null;
};
