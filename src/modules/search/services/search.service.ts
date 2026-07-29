import * as productRepository from "../../products/repositories/product.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { Product } from "../../../types";

export const search = (query: string, category?: string): Product[] => {
  if (!query || !query.trim()) {
    throw new InvalidDataError("Search term is required");
  }

  const term = query.toLowerCase().trim();
  const products = productRepository.findAll();

  let results = products.filter((p) => p.name.toLowerCase().includes(term));

  if (category) {
    const normalizedCategory = category.trim().toLowerCase();
    results = results.filter((p) => p.category.toLowerCase() === normalizedCategory);
  }

  return results;
};
