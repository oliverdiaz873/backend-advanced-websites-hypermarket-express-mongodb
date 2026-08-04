import { InventoryModel } from "../models/inventory.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import { INVENTORY_SORT_FIELDS, InventorySortField } from "../constants/inventory-sort-fields";
import type {
  Inventory,
  InventoryPageResult,
  InventoryQuery,
  InventoryStatus,
  SortDirection,
} from "../../../types";

const buildSort = (
  sortBy: InventorySortField | undefined,
  sortOrder: SortDirection
): Record<string, 1 | -1> => {
  if (!sortBy || !INVENTORY_SORT_FIELDS.includes(sortBy)) {
    return { updatedAt: -1 };
  }
  const direction: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: direction };
};

const toInventory = (doc: InstanceType<typeof InventoryModel>): Inventory =>
  doc.toJSON() as unknown as Inventory;

export const findAll = async (): Promise<Inventory[]> => {
  const docs = await InventoryModel.find();
  return docs.map(toInventory);
};

export const findPage = async (query: InventoryQuery): Promise<InventoryPageResult> => {
  const { page, limit, status, productIds, sortBy, sortOrder } = query;

  const filter: Record<string, unknown> = {};
  if (productIds && productIds.length > 0) {
    filter.productId = { $in: productIds };
  }
  if (status === "out-of-stock") {
    filter.$expr = { $lte: [{ $subtract: ["$stock", "$reservedStock"] }, 0] };
  } else if (status === "low-stock") {
    filter.minStock = { $ne: null };
    filter.$expr = {
      $and: [
        { $lte: ["$stock", "$minStock"] },
        { $gt: [{ $subtract: ["$stock", "$reservedStock"] }, 0] },
      ],
    };
  }

  const skip = (page - 1) * limit;
  const sort = buildSort(sortBy, sortOrder ?? "desc");

  const [docs, total] = await Promise.all([
    InventoryModel.find(filter).sort(sort).skip(skip).limit(limit),
    InventoryModel.countDocuments(filter),
  ]);

  const items = docs.map(toInventory);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const findById = async (id: string): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findById(id);
  return doc ? toInventory(doc) : null;
};

export const findByProductId = async (productId: string): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOne({ productId });
  return doc ? toInventory(doc) : null;
};

export const findLowStock = async (): Promise<Inventory[]> => {
  const docs = await InventoryModel.find({ minStock: { $ne: null }, $expr: { $lte: ["$stock", "$minStock"] } });
  return docs.map(toInventory);
};

export const findOutOfStock = async (): Promise<Inventory[]> => {
  const docs = await InventoryModel.find({
    $expr: { $lte: [{ $subtract: ["$stock", "$reservedStock"] }, 0] },
  });
  return docs.map(toInventory);
};

export const reserveStock = async (productId: string, quantity: number): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOneAndUpdate(
    { productId, $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity] } },
    { $inc: { reservedStock: quantity } },
    { new: true }
  );
  return doc ? toInventory(doc) : null;
};

export const releaseReservation = async (productId: string, quantity: number): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOneAndUpdate(
    { productId, reservedStock: { $gte: quantity } },
    { $inc: { reservedStock: -quantity } },
    { new: true }
  );
  return doc ? toInventory(doc) : null;
};

export const completeReservation = async (productId: string, quantity: number): Promise<Inventory | null> => {
  const doc = await InventoryModel.findOneAndUpdate(
    { productId, reservedStock: { $gte: quantity } },
    { $inc: { stock: -quantity, reservedStock: -quantity } },
    { new: true }
  );
  return doc ? toInventory(doc) : null;
};

export const increaseById = async (id: string, quantity: number): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findByIdAndUpdate(id, { $inc: { stock: quantity } }, { new: true });
  return doc ? toInventory(doc) : null;
};

export const decreaseById = async (id: string, quantity: number): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findOneAndUpdate(
    { _id: id, $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity] } },
    { $inc: { stock: -quantity } },
    { new: true }
  );
  return doc ? toInventory(doc) : null;
};

export const setStockById = async (id: string, quantity: number): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findByIdAndUpdate(id, { $set: { stock: quantity } }, { new: true });
  return doc ? toInventory(doc) : null;
};

export const setMinStockById = async (id: string, minStock: number): Promise<Inventory | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await InventoryModel.findByIdAndUpdate(id, { $set: { minStock } }, { new: true });
  return doc ? toInventory(doc) : null;
};

export const create = async (data: {
  productId: string;
  stock?: number;
  minStock?: number;
}): Promise<Inventory> => {
  const doc = await InventoryModel.create({
    productId: data.productId,
    stock: data.stock ?? 0,
    ...(data.minStock !== undefined && { minStock: data.minStock }),
  });
  return doc.toJSON() as unknown as Inventory;
};

export const deleteByProductId = async (productId: string): Promise<boolean> => {
  const result = await InventoryModel.deleteOne({ productId });
  return result.deletedCount > 0;
};

export const deleteById = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) return false;
  const result = await InventoryModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
};

export const deriveStatus = (record: Pick<Inventory, "stock" | "reservedStock" | "minStock">): InventoryStatus => {
  const available = record.stock - record.reservedStock;
  if (available <= 0) return "out-of-stock";
  if (record.minStock !== undefined && record.minStock !== null && record.stock <= record.minStock) {
    return "low-stock";
  }
  return "ok";
};
