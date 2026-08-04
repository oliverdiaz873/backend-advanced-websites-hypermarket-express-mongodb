import * as inventoryMovementService from "../../../src/modules/inventory-movements/services/inventory-movement.service";
import { makeMovement, MOVEMENT_ID } from "../factories/inventory-movement.factory";
import { INVENTORY_ID } from "../factories/inventory.factory";
import { PRODUCT_ID } from "../factories/product.factory";

jest.mock("../../../src/modules/inventory-movements/repositories/inventory-movement.repository", () =>
  require("../mocks/repositories").mockInventoryMovementRepository
);

import { mockInventoryMovementRepository } from "../mocks/repositories";

describe("inventory-movement.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("record", () => {
    it("delega en el repositorio y retorna el movimiento", async () => {
      const movement = makeMovement();
      mockInventoryMovementRepository.create.mockResolvedValue(movement);

      const result = await inventoryMovementService.record({
        inventoryId: INVENTORY_ID,
        productId: PRODUCT_ID,
        type: "increase",
        quantity: 10,
        previousStock: 10,
        newStock: 20,
        previousReservedStock: 0,
        newReservedStock: 0,
        reason: "supplier_adjustment",
        createdBy: "64b0000000000000000000f1",
      });

      expect(mockInventoryMovementRepository.create).toHaveBeenCalledWith({
        inventoryId: INVENTORY_ID,
        productId: PRODUCT_ID,
        type: "increase",
        quantity: 10,
        previousStock: 10,
        newStock: 20,
        previousReservedStock: 0,
        newReservedStock: 0,
        reason: "supplier_adjustment",
        createdBy: "64b0000000000000000000f1",
      });
      expect(result).toEqual(movement);
    });
  });

  describe("getByInventoryId", () => {
    it("retorna el historial paginado de un registro", async () => {
      const movement = makeMovement();
      mockInventoryMovementRepository.findByInventoryId.mockResolvedValue({
        items: [movement],
        total: 1,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });

      const result = await inventoryMovementService.getByInventoryId(INVENTORY_ID, 1, 50);

      expect(mockInventoryMovementRepository.findByInventoryId).toHaveBeenCalledWith(INVENTORY_ID, {
        page: 1,
        limit: 50,
      });
      expect(result).toEqual({ data: [movement], pagination: { page: 1, limit: 50, total: 1, pages: 1 } });
    });
  });

  describe("getPage", () => {
    it("retorna el historial global con filtros", async () => {
      const movement = makeMovement({ type: "decrease" });
      mockInventoryMovementRepository.findPage.mockResolvedValue({
        items: [movement],
        total: 1,
        pagination: { page: 2, limit: 10, total: 1, pages: 1 },
      });

      const result = await inventoryMovementService.getPage({
        page: 2,
        limit: 10,
        productId: PRODUCT_ID,
        type: "decrease",
      });

      expect(mockInventoryMovementRepository.findPage).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        productId: PRODUCT_ID,
        type: "decrease",
      });
      expect(result.data).toEqual([movement]);
    });
  });

  describe("removeByProductId", () => {
    it("elimina los movimientos del producto", async () => {
      await inventoryMovementService.removeByProductId(PRODUCT_ID);
      expect(mockInventoryMovementRepository.deleteByProductId).toHaveBeenCalledWith(PRODUCT_ID);
    });
  });

  describe("removeByInventoryId", () => {
    it("elimina los movimientos del registro", async () => {
      await inventoryMovementService.removeByInventoryId(INVENTORY_ID);
      expect(mockInventoryMovementRepository.deleteByInventoryId).toHaveBeenCalledWith(INVENTORY_ID);
    });
  });
});
