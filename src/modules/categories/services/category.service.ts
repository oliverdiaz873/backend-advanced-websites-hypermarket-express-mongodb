import * as categoryRepository from "../repositories/category.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Category } from "../../../types";

export const getAll = (): Category[] => {
  return categoryRepository.findAll();
};

export const getById = (id: string): Category => {
  const category = categoryRepository.findById(id);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
};
