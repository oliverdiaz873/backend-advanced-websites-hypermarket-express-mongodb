import * as inventoryRepository from "../repositories/inventory.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
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
