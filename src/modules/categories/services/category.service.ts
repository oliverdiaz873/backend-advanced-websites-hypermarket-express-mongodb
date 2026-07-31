import * as categoryRepository from "../repositories/category.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Category } from "../../../types";

export const getAll = async (): Promise<Category[]> => {
  return categoryRepository.findAll();
};

export const getById = async (id: string): Promise<Category> => {
  const category = await categoryRepository.findById(id);
  if (!category) {
    throw new NotFoundError("Category not found");
  }
  return category;
};
