import products from "../data/products.data";
import type { Product } from "../../../types";

export const findAll = (): Product[] => {
  return products;
};

export const findById = (id: string): Product | null => {
  return products.find((p) => p.id === id) || null;
};
