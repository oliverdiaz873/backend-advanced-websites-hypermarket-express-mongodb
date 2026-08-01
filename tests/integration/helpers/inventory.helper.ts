import { InventoryModel } from "../../../src/modules/inventory/models/inventory.model";
import type { Inventory } from "../../../src/types";

export const createTestInventory = async (
  productId: string,
  overrides: Partial<Inventory> = {}
): Promise<Inventory> => {
  const { id, ...rest } = overrides;
  const record = await InventoryModel.create({
    productId,
    stock: 10,
    reservedStock: 0,
    ...rest,
  });
  return record.toJSON() as unknown as Inventory;
};
