import * as productRepository from "../repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Product } from "../../../types";

export const getAll = (): Product[] => {
  return productRepository.findAll();
};

export const getById = (id: string): Product => {
  const product = productRepository.findById(id);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  return product;
};
