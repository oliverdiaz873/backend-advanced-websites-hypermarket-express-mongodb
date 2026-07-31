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
