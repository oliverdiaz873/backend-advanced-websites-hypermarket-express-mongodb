import { InventoryMovementModel } from "../models/inventory-movement.model";
import type {
  InventoryMovement,
  InventoryMovementQuery,
  InventoryMovementType,
  PaginationMeta,
} from "../../../types";

export interface InventoryMovementPageResult {
  items: InventoryMovement[];
  total: number;
  pagination: PaginationMeta;
}

export const create = async (
  data: Omit<InventoryMovement, "id" | "createdAt">
): Promise<InventoryMovement> => {
  const doc = await InventoryMovementModel.create(data);
  return doc.toJSON() as unknown as InventoryMovement;
};

export const findByInventoryId = async (
  inventoryId: string,
  query: { page: number; limit: number }
): Promise<InventoryMovementPageResult> => {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    InventoryMovementModel.find({ inventoryId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryMovementModel.countDocuments({ inventoryId }),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as InventoryMovement);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const findPage = async (query: InventoryMovementQuery): Promise<InventoryMovementPageResult> => {
  const { page, limit, productId, type } = query;
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (productId) filter.productId = productId;
  if (type) filter.type = type;

  const [docs, total] = await Promise.all([
    InventoryMovementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    InventoryMovementModel.countDocuments(filter),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as InventoryMovement);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const deleteByInventoryId = async (inventoryId: string): Promise<void> => {
  await InventoryMovementModel.deleteMany({ inventoryId });
};

export const deleteByProductId = async (productId: string): Promise<void> => {
  await InventoryMovementModel.deleteMany({ productId });
};

export const isValidMovementType = (value: unknown): value is InventoryMovementType => {
  return typeof value === "string" && ["increase", "decrease", "set", "min_stock_change"].includes(value);
};
