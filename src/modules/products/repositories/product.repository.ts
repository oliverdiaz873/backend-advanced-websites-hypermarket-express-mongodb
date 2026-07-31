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
