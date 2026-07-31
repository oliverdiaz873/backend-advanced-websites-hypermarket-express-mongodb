import * as productRepository from "../../products/repositories/product.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { Product } from "../../../types";

export const search = async (query: string, category?: string): Promise<Product[]> => {
  if (!query || !query.trim()) {
    throw new InvalidDataError("Search term is required");
  }

  return productRepository.search(query, category);
};
