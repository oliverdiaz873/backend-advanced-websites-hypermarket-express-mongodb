import * as inventoryRepository from "../repositories/inventory.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../shared/errors/insufficient-stock.error";
import type { Inventory } from "../../../types";

export const getAll = async (): Promise<Inventory[]> => {
  return inventoryRepository.findAll();
};

export const getById = async (id: string): Promise<Inventory> => {
  const record = await inventoryRepository.findById(id);
  if (!record) {
    throw new NotFoundError("Inventory record not found");
  }
  return record;
};

export const getByProductId = async (productId: string): Promise<Inventory | null> => {
  return inventoryRepository.findByProductId(productId);
};

export const getLowStock = async (): Promise<Inventory[]> => {
  return inventoryRepository.findLowStock();
};

export const decreaseStock = async (productId: string, quantity: number): Promise<void> => {
  const record = await inventoryRepository.decreaseStock(productId, quantity);
  if (!record) {
    throw new InsufficientStockError(`Insufficient stock for product ${productId}`);
  }
};

export const restoreStock = async (productId: string, quantity: number): Promise<void> => {
  const record = await inventoryRepository.restoreStock(productId, quantity);
  if (!record) {
    throw new NotFoundError("Inventory record not found");
  }
};

export const adjustStock = async (id: string, data: { stock?: number; minStock?: number }): Promise<Inventory> => {
  const record = await inventoryRepository.findById(id);
  if (!record) {
    throw new NotFoundError("Inventory record not found");
  }

  const updates: { stock?: number; minStock?: number } = {};
  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0) {
      throw new InvalidDataError("Stock must be a non-negative integer");
    }
    updates.stock = data.stock;
  }
  if (data.minStock !== undefined) {
    if (!Number.isInteger(data.minStock) || data.minStock < 0) {
      throw new InvalidDataError("minStock must be a non-negative integer");
    }
    updates.minStock = data.minStock;
  }

  const updated = await inventoryRepository.updateById(id, updates);
  if (!updated) {
    throw new NotFoundError("Inventory record not found");
  }
  return updated;
};
