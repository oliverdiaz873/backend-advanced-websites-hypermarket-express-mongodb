import { CategoryModel } from "../models/category.model";
import type { Category } from "../../../types";

export const findAll = async (): Promise<Category[]> => {
  const docs = await CategoryModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Category);
};

export const findById = async (id: string): Promise<Category | null> => {
  const doc = await CategoryModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Category) : null;
};
