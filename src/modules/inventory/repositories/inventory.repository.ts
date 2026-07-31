import inventory from "../data/inventory.data";
import type { Inventory } from "../../../types";

export const findAll = (): Inventory[] => {
  return inventory;
};

export const findById = (id: string): Inventory | null => {
  return inventory.find((i) => i.id === id) || null;
};

export const findByProductId = (productId: string): Inventory | null => {
  return inventory.find((i) => i.productId === productId) || null;
};
