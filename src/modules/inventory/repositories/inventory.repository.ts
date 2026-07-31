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

export const findLowStock = async (): Promise<Inventory[]> => {
  const docs = await InventoryModel.find({ minStock: { $ne: null }, $expr: { $lte: ["$stock", "$minStock"] } });
  return docs.map((doc) => doc.toJSON() as unknown as Inventory);
};

export const decreaseStock = async (productId: string, quantity: number): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOneAndUpdate(
    { productId, $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity] } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  return doc ? (doc.toJSON() as unknown as Inventory) : null;
};

export const restoreStock = async (productId: string, quantity: number): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOneAndUpdate({ productId }, { $inc: { stock: quantity } }, { new: true });
  return doc ? (doc.toJSON() as unknown as Inventory) : null;
};

export const updateById = async (id: string, updates: Partial<Pick<Inventory, "stock" | "minStock">>): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Inventory) : null;
};
