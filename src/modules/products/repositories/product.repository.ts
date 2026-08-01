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

export const findByIds = async (ids: string[]): Promise<Product[]> => {
  const docs = await ProductModel.find({ _id: { $in: ids } });
  const byId = new Map(docs.map((doc) => [doc._id as string, doc.toJSON() as unknown as Product]));
  return ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
};

export const findBySku = async (sku: string): Promise<Product | null> => {
  const doc = await ProductModel.findOne({ sku });
  return doc ? (doc.toJSON() as unknown as Product) : null;
};

export const existsByCategoryId = async (categoryId: string): Promise<boolean> => {
  const doc = await ProductModel.exists({ categoryId });
  return Boolean(doc);
};

export const existsByBrandId = async (brandId: string): Promise<boolean> => {
  const doc = await ProductModel.exists({ brandId });
  return Boolean(doc);
};

export const updateCategoryEmbeds = async (
  categoryId: string,
  data: { name: string; slug: string }
): Promise<void> => {
  await ProductModel.updateMany({ categoryId }, { $set: { category: data } });
};

export const updateBrandEmbeds = async (brandId: string, data: { name: string; slug: string }): Promise<void> => {
  await ProductModel.updateMany({ brandId }, { $set: { brand: data } });
};

export const create = async (
  data: Omit<Product, "id" | "createdAt" | "updatedAt"> & { _id: string }
): Promise<Product> => {
  const doc = await ProductModel.create(data);
  return doc.toJSON() as unknown as Product;
};

export const updateById = async (
  id: string,
  updates: Record<string, unknown>,
  options?: { unset?: string[] }
): Promise<Product | null> => {
  const updateDoc: Record<string, unknown> = { $set: updates };
  if (options?.unset && options.unset.length > 0) {
    updateDoc.$unset = Object.fromEntries(options.unset.map((key) => [key, 1]));
  }
  const doc = await ProductModel.findByIdAndUpdate(id, updateDoc, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Product) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  const result = await ProductModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const search = async (query: string, category?: string): Promise<Product[]> => {
  const term = query.trim();
  const categoryFilter = category ? { "category.slug": category.trim().toLowerCase() } : {};

  if (term.split(/\s+/).length > 1) {
    const docs = await ProductModel.find({ $text: { $search: term }, ...categoryFilter }).sort({
      score: { $meta: "textScore" },
    });
    if (docs.length > 0) {
      return docs.map((doc) => doc.toJSON() as unknown as Product);
    }
  }

  const docs = await ProductModel.find({
    name: { $regex: escapeRegExp(term), $options: "i" },
    ...categoryFilter,
  });
  return docs.map((doc) => doc.toJSON() as unknown as Product);
};
