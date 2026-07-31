import * as productRepository from "../../products/repositories/product.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { Product } from "../../../types";

export const search = async (query: string, category?: string): Promise<Product[]> => {
  if (!query || !query.trim()) {
    throw new InvalidDataError("Search term is required");
  }

  const term = query.toLowerCase().trim();
  const products = await productRepository.findAll();

  let results = products.filter((p) => p.name.toLowerCase().includes(term));

  if (category) {
    const normalizedCategory = category.trim().toLowerCase();
    results = results.filter((p) => p.category.slug === normalizedCategory);
  }

  return results;
};
