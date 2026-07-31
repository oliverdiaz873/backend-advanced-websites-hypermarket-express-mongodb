import * as inventoryRepository from "../repositories/inventory.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { Inventory } from "../../../types";

export const getAll = (): Inventory[] => {
  return inventoryRepository.findAll();
};

export const getById = (id: string): Inventory => {
  const record = inventoryRepository.findById(id);
  if (!record) {
    throw new NotFoundError("Inventory record not found");
  }
  return record;
};

export const getByProductId = (productId: string): Inventory | null => {
  return inventoryRepository.findByProductId(productId);
};
