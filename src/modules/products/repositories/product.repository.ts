import { ProductModel } from "../models/product.model";
import type { Product } from "../../../types";

export const findAll = async (): Promise<Product[]> => {
  const docs = await ProductModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Product);
};

export const findById = async (id: string): Promise<Product | null> => {
  const doc = await ProductModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Product) : null;
};
