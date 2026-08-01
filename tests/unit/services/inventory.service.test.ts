import * as inventoryService from "../../../src/modules/inventory/services/inventory.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../src/shared/errors/insufficient-stock.error";
import { makeInventory, INVENTORY_ID } from "../factories/inventory.factory";
import { PRODUCT_ID } from "../factories/product.factory";

jest.mock("../../../src/modules/inventory/repositories/inventory.repository", () =>
  require("../mocks/repositories").mockInventoryRepository
);

import { mockInventoryRepository } from "../mocks/repositories";

describe("inventory.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("retorna todos los registros de inventario", async () => {
      const records = [makeInventory(), makeInventory({ id: "64b0000000000000000000d2", stock: 0 })];
      mockInventoryRepository.findAll.mockResolvedValue(records);

      const result = await inventoryService.getAll();

      expect(mockInventoryRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(records);
    });
  });

  describe("getById", () => {
    it("retorna el registro si existe", async () => {
      const record = makeInventory();
      mockInventoryRepository.findById.mockResolvedValue(record);

      const result = await inventoryService.getById(INVENTORY_ID);

      expect(mockInventoryRepository.findById).toHaveBeenCalledWith(INVENTORY_ID);
      expect(result).toEqual(record);
    });

    it("lanza NotFoundError si el registro no existe", async () => {
      mockInventoryRepository.findById.mockResolvedValue(null);

      await expect(inventoryService.getById(INVENTORY_ID)).rejects.toThrow(NotFoundError);
      await expect(inventoryService.getById(INVENTORY_ID)).rejects.toThrow("Inventory record not found");
    });
  });

  describe("getByProductId", () => {
    it("retorna el registro del producto", async () => {
      const record = makeInventory();
      mockInventoryRepository.findByProductId.mockResolvedValue(record);

      const result = await inventoryService.getByProductId(PRODUCT_ID);

      expect(mockInventoryRepository.findByProductId).toHaveBeenCalledWith(PRODUCT_ID);
      expect(result).toEqual(record);
    });

    it("lanza NotFoundError si el producto no tiene inventario", async () => {
      mockInventoryRepository.findByProductId.mockResolvedValue(null);

      await expect(inventoryService.getByProductId(PRODUCT_ID)).rejects.toThrow(NotFoundError);
      await expect(inventoryService.getByProductId(PRODUCT_ID)).rejects.toThrow("Inventory not found");
    });
  });

  describe("getLowStock", () => {
    it("retorna los productos con stock bajo", async () => {
      const lowStock = [makeInventory({ stock: 5, minStock: 10 })];
      mockInventoryRepository.findLowStock.mockResolvedValue(lowStock);

      const result = await inventoryService.getLowStock();

      expect(mockInventoryRepository.findLowStock).toHaveBeenCalledTimes(1);
      expect(result).toEqual(lowStock);
    });
  });

  describe("decreaseStock", () => {
    it("decrementa el stock sin errores si hay disponibilidad", async () => {
      mockInventoryRepository.decreaseStock.mockResolvedValue(makeInventory({ stock: 48 }));

      await expect(inventoryService.decreaseStock(PRODUCT_ID, 2)).resolves.toBeUndefined();
      expect(mockInventoryRepository.decreaseStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
    });

    it("lanza InsufficientStockError si no hay stock suficiente", async () => {
      mockInventoryRepository.decreaseStock.mockResolvedValue(null);

      await expect(inventoryService.decreaseStock(PRODUCT_ID, 999)).rejects.toThrow(InsufficientStockError);
      await expect(inventoryService.decreaseStock(PRODUCT_ID, 999)).rejects.toThrow(
        `Insufficient stock for product ${PRODUCT_ID}`
      );
    });
  });

  describe("restoreStock", () => {
    it("restaura stock sin errores si el registro existe", async () => {
      mockInventoryRepository.restoreStock.mockResolvedValue(makeInventory({ stock: 52 }));

      await expect(inventoryService.restoreStock(PRODUCT_ID, 2)).resolves.toBeUndefined();
      expect(mockInventoryRepository.restoreStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
    });

    it("lanza NotFoundError si el registro no existe", async () => {
      mockInventoryRepository.restoreStock.mockResolvedValue(null);

      await expect(inventoryService.restoreStock(PRODUCT_ID, 2)).rejects.toThrow(NotFoundError);
    });
  });

  describe("adjustStock", () => {
    it("actualiza el stock cuando el valor es válido", async () => {
      const updated = makeInventory({ stock: 30 });
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());
      mockInventoryRepository.updateById.mockResolvedValue(updated);

      const result = await inventoryService.adjustStock(INVENTORY_ID, { stock: 30 });

      expect(mockInventoryRepository.updateById).toHaveBeenCalledWith(INVENTORY_ID, { stock: 30 });
      expect(result).toEqual(updated);
    });

    it("actualiza solo minStock cuando solo se envía minStock", async () => {
      const updated = makeInventory({ minStock: 5 });
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());
      mockInventoryRepository.updateById.mockResolvedValue(updated);

      const result = await inventoryService.adjustStock(INVENTORY_ID, { minStock: 5 });

      expect(mockInventoryRepository.updateById).toHaveBeenCalledWith(INVENTORY_ID, { minStock: 5 });
      expect(result).toEqual(updated);
    });

    it("lanza InvalidDataError si stock no es entero", async () => {
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());

      await expect(inventoryService.adjustStock(INVENTORY_ID, { stock: 1.5 })).rejects.toThrow(InvalidDataError);
      await expect(inventoryService.adjustStock(INVENTORY_ID, { stock: 1.5 })).rejects.toThrow(
        "Stock must be a non-negative integer"
      );
      expect(mockInventoryRepository.updateById).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si stock es negativo", async () => {
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());

      await expect(inventoryService.adjustStock(INVENTORY_ID, { stock: -1 })).rejects.toThrow(InvalidDataError);
    });

    it("lanza InvalidDataError si minStock no es entero", async () => {
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());

      await expect(inventoryService.adjustStock(INVENTORY_ID, { minStock: 2.5 })).rejects.toThrow(InvalidDataError);
      await expect(inventoryService.adjustStock(INVENTORY_ID, { minStock: 2.5 })).rejects.toThrow(
        "minStock must be a non-negative integer"
      );
    });

    it("lanza NotFoundError si el registro no existe", async () => {
      mockInventoryRepository.findById.mockResolvedValue(null);

      await expect(inventoryService.adjustStock(INVENTORY_ID, { stock: 10 })).rejects.toThrow(NotFoundError);
      expect(mockInventoryRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
