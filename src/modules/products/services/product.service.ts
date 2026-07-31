import * as productRepository from "../repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Product } from "../../../types";

export const getAll = async (): Promise<Product[]> => {
  return productRepository.findAll();
};

export const getById = async (id: string): Promise<Product> => {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return product;
};
