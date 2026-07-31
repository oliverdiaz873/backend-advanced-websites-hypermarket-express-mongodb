import { InventoryModel } from "../models/inventory.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import type { Inventory } from "../../../types";

export const findAll = async (): Promise<Inventory[]> => {
  const docs = await InventoryModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Inventory);
};

export const findById = async (id: string): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Inventory) : null;
};

export const findByProductId = async (productId: string): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOne({ productId });
  return doc ? (doc.toJSON() as unknown as Inventory) : null;
};
