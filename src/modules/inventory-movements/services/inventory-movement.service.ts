import * as inventoryMovementRepository from "../repositories/inventory-movement.repository";
import type {
  AdjustmentReason,
  InventoryMovement,
  InventoryMovementType,
  PaginationMeta,
} from "../../../types";

export interface RecordMovementInput {
  inventoryId: string;
  productId: string;
  orderId?: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  previousReservedStock: number;
  newReservedStock: number;
  reason: AdjustmentReason;
  createdBy?: string;
}

export const record = async (input: RecordMovementInput): Promise<InventoryMovement> => {
  return inventoryMovementRepository.create(input);
};

export const getByInventoryId = async (
  inventoryId: string,
  page: number,
  limit: number
): Promise<{ data: InventoryMovement[]; pagination: PaginationMeta }> => {
  const result = await inventoryMovementRepository.findByInventoryId(inventoryId, { page, limit });
  return { data: result.items, pagination: result.pagination };
};

export const getPage = async (query: {
  page: number;
  limit: number;
  productId?: string;
  type?: InventoryMovementType;
}): Promise<{ data: InventoryMovement[]; pagination: PaginationMeta }> => {
  const result = await inventoryMovementRepository.findPage(query);
  return { data: result.items, pagination: result.pagination };
};

export const removeByProductId = async (productId: string): Promise<void> => {
  await inventoryMovementRepository.deleteByProductId(productId);
};

export const removeByInventoryId = async (inventoryId: string): Promise<void> => {
  await inventoryMovementRepository.deleteByInventoryId(inventoryId);
};
