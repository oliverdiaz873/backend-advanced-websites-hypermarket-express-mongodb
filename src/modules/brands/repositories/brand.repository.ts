import { BrandModel } from "../models/brand.model";
import type { Brand } from "../../../types";

export const findAll = async (): Promise<Brand[]> => {
  const docs = await BrandModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Brand);
};

export const findById = async (id: string): Promise<Brand | null> => {
  const doc = await BrandModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Brand) : null;
};

export const findByName = async (name: string): Promise<Brand | null> => {
  const doc = await BrandModel.findOne({ name });
  return doc ? (doc.toJSON() as unknown as Brand) : null;
};

export const findBySlug = async (slug: string): Promise<Brand | null> => {
  const doc = await BrandModel.findOne({ slug });
  return doc ? (doc.toJSON() as unknown as Brand) : null;
};

export const create = async (data: Omit<Brand, "id"> & { _id: string }): Promise<Brand> => {
  const doc = await BrandModel.create(data);
  return doc.toJSON() as unknown as Brand;
};

export const updateById = async (
  id: string,
  updates: Record<string, unknown> & { updatedAt: Date }
): Promise<Brand | null> => {
  const doc = await BrandModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Brand) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  const result = await BrandModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
};
