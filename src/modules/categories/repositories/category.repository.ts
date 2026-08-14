import { CategoryModel } from "../models/category.model";
import { type ISoftDeleteDocument } from "../../../shared/plugins/soft-delete.plugin";
import type { Category } from "../../../types";

export const findAll = async (): Promise<Category[]> => {
  const docs = await CategoryModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Category);
};

export const findById = async (id: string): Promise<Category | null> => {
  const doc = await CategoryModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Category) : null;
};

export const findByName = async (name: string): Promise<Category | null> => {
  const doc = await CategoryModel.findOne({ name });
  return doc ? (doc.toJSON() as unknown as Category) : null;
};

export const findBySlug = async (slug: string): Promise<Category | null> => {
  const doc = await CategoryModel.findOne({ slug });
  return doc ? (doc.toJSON() as unknown as Category) : null;
};

export const create = async (data: Omit<Category, "id"> & { _id: string }): Promise<Category> => {
  const doc = await CategoryModel.create(data);
  return doc.toJSON() as unknown as Category;
};

export const updateById = async (
  id: string,
  updates: Record<string, unknown> & { updatedAt: Date }
): Promise<Category | null> => {
  const doc = await CategoryModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Category) : null;
};

export const softDeleteById = async (id: string): Promise<boolean> => {
  const doc = (await CategoryModel.findById(id)) as unknown as ISoftDeleteDocument | null;
  if (!doc) return false;
  await doc.softDelete();
  return true;
};

export const restoreById = async (id: string): Promise<boolean> => {
  const doc = (await CategoryModel.findOne({ _id: id, includeDeleted: true })) as unknown as ISoftDeleteDocument | null;
  if (!doc) return false;
  await doc.restore();
  return true;
};
