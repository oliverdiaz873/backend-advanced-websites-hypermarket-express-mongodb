import * as inventoryService from "../../../src/modules/inventory/services/inventory.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../src/shared/errors/insufficient-stock.error";
import { makeInventory, INVENTORY_ID } from "../factories/inventory.factory";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";

jest.mock("../../../src/modules/inventory/repositories/inventory.repository", () =>
  require("../mocks/repositories").mockInventoryRepository
);
jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);
jest.mock("../../../src/modules/inventory-movements/services/inventory-movement.service", () =>
  require("../mocks/repositories").mockInventoryMovementService
);

import {
  mockInventoryRepository,
  mockProductRepository,
  mockInventoryMovementService,
} from "../mocks/repositories";

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
    it("retorna el registro con status derivado", async () => {
      const record = makeInventory();
      mockInventoryRepository.findById.mockResolvedValue(record);

      const result = await inventoryService.getById(INVENTORY_ID);

      expect(mockInventoryRepository.findById).toHaveBeenCalledWith(INVENTORY_ID);
      expect(result).toEqual({ ...record, status: "ok" });
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
      expect(result).toEqual({ ...record, status: "ok" });
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
      expect(result[0].status).toBe("low-stock");
    });
  });

  describe("getOutOfStock", () => {
    it("retorna los productos agotados con status out-of-stock", async () => {
      const out = [makeInventory({ stock: 0 })];
      mockInventoryRepository.findOutOfStock.mockResolvedValue(out);

      const result = await inventoryService.getOutOfStock();

      expect(mockInventoryRepository.findOutOfStock).toHaveBeenCalledTimes(1);
      expect(result[0].status).toBe("out-of-stock");
    });
  });

  describe("reserveStock", () => {
    it("reserva stock y registra el movimiento", async () => {
      mockInventoryRepository.reserveStock.mockResolvedValue(
        makeInventory({ stock: 50, reservedStock: 2, availableStock: 48 })
      );

      await expect(inventoryService.reserveStock(PRODUCT_ID, 2, "order-1", "actor-1")).resolves.toBeUndefined();
      expect(mockInventoryRepository.reserveStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "reserve",
          productId: PRODUCT_ID,
          orderId: "order-1",
          quantity: 2,
          previousStock: 50,
          newStock: 50,
          previousReservedStock: 0,
          newReservedStock: 2,
          reason: "order_reserved",
          createdBy: "actor-1",
        })
      );
    });

    it("lanza InsufficientStockError si no hay stock disponible", async () => {
      mockInventoryRepository.reserveStock.mockResolvedValue(null);

      await expect(inventoryService.reserveStock(PRODUCT_ID, 999)).rejects.toThrow(InsufficientStockError);
    });

    it("lanza InvalidDataError si quantity no es un entero positivo", async () => {
      await expect(inventoryService.reserveStock(PRODUCT_ID, 0)).rejects.toThrow(InvalidDataError);
    });
  });

  describe("releaseReservation", () => {
    it("libera la reserva y registra el movimiento", async () => {
      mockInventoryRepository.releaseReservation.mockResolvedValue(
        makeInventory({ stock: 50, reservedStock: 0, availableStock: 50 })
      );

      await expect(inventoryService.releaseReservation(PRODUCT_ID, 2, "order-1", "actor-1")).resolves.toBeUndefined();
      expect(mockInventoryRepository.releaseReservation).toHaveBeenCalledWith(PRODUCT_ID, 2);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "release_reservation",
          productId: PRODUCT_ID,
          orderId: "order-1",
          quantity: 2,
          previousStock: 50,
          newStock: 50,
          previousReservedStock: 2,
          newReservedStock: 0,
          reason: "order_release",
          createdBy: "actor-1",
        })
      );
    });

    it("lanza InsufficientStockError si no hay reserva que liberar", async () => {
      mockInventoryRepository.releaseReservation.mockResolvedValue(null);

      await expect(inventoryService.releaseReservation(PRODUCT_ID, 2)).rejects.toThrow(InsufficientStockError);
    });

    it("lanza InvalidDataError si quantity no es un entero positivo", async () => {
      await expect(inventoryService.releaseReservation(PRODUCT_ID, 0)).rejects.toThrow(InvalidDataError);
    });
  });

  describe("reserveForOrder", () => {
    it("reserva todos los productos y registra un movimiento por línea", async () => {
      const inventory = makeInventory({ stock: 50, reservedStock: 0, availableStock: 50 });
      mockInventoryRepository.findByIds.mockResolvedValue([inventory]);
      mockInventoryRepository.reserveStock.mockResolvedValue(
        makeInventory({ stock: 50, reservedStock: 2, availableStock: 48 })
      );

      await expect(
        inventoryService.reserveForOrder([{ productId: PRODUCT_ID, quantity: 2 }], "order-1", "actor-1")
      ).resolves.toBeUndefined();

      expect(mockInventoryRepository.findByIds).toHaveBeenCalledWith([PRODUCT_ID]);
      expect(mockInventoryRepository.reserveStock).toHaveBeenCalledWith(PRODUCT_ID, 2);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "reserve", productId: PRODUCT_ID, orderId: "order-1", quantity: 2 })
      );
    });

    it("lanza InsufficientStockError y no reserva nada si falta una línea", async () => {
      mockInventoryRepository.findByIds.mockResolvedValue([makeInventory()]);
      mockInventoryRepository.reserveStock.mockResolvedValue(makeInventory());

      await expect(
        inventoryService.reserveForOrder([
          { productId: PRODUCT_ID, quantity: 2 },
          { productId: "product-faltante", quantity: 1 },
        ])
      ).rejects.toThrow(InsufficientStockError);

      expect(mockInventoryRepository.reserveStock).not.toHaveBeenCalled();
    });

    it("lanza InsufficientStockError si una línea no tiene stock disponible", async () => {
      mockInventoryRepository.findByIds.mockResolvedValue([
        makeInventory({ stock: 1, reservedStock: 1, availableStock: 0 }),
      ]);

      await expect(
        inventoryService.reserveForOrder([{ productId: PRODUCT_ID, quantity: 1 }])
      ).rejects.toThrow(InsufficientStockError);

      expect(mockInventoryRepository.reserveStock).not.toHaveBeenCalled();
    });

    it("compensa liberando las líneas ya reservadas si una reserva falla", async () => {
      mockInventoryRepository.findByIds.mockResolvedValue([
        makeInventory(),
        makeInventory({ productId: "segundo" }),
      ]);
      mockInventoryRepository.reserveStock
        .mockResolvedValueOnce(makeInventory())
        .mockResolvedValueOnce(null);

      await expect(
        inventoryService.reserveForOrder([
          { productId: PRODUCT_ID, quantity: 2 },
          { productId: "segundo", quantity: 1 },
        ])
      ).rejects.toThrow(InsufficientStockError);

      expect(mockInventoryRepository.releaseReservation).toHaveBeenCalledWith(PRODUCT_ID, 2);
    });

    it("lanza InvalidDataError si una cantidad no es un entero positivo", async () => {
      await expect(
        inventoryService.reserveForOrder([{ productId: PRODUCT_ID, quantity: 0 }])
      ).rejects.toThrow(InvalidDataError);
    });
  });

  describe("completeReservation", () => {
    it("consume la reserva (stock y reservedStock) y registra el movimiento", async () => {
      mockInventoryRepository.completeReservation.mockResolvedValue(
        makeInventory({ stock: 48, reservedStock: 0, availableStock: 48 })
      );

      await expect(inventoryService.completeReservation(PRODUCT_ID, 2, "order-1", "actor-1")).resolves.toBeUndefined();
      expect(mockInventoryRepository.completeReservation).toHaveBeenCalledWith(PRODUCT_ID, 2);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "complete_sale",
          productId: PRODUCT_ID,
          orderId: "order-1",
          quantity: 2,
          previousStock: 50,
          newStock: 48,
          previousReservedStock: 2,
          newReservedStock: 0,
          reason: "order_completed",
          createdBy: "actor-1",
        })
      );
    });

    it("lanza InsufficientStockError si no hay reserva que completar", async () => {
      mockInventoryRepository.completeReservation.mockResolvedValue(null);

      await expect(inventoryService.completeReservation(PRODUCT_ID, 2)).rejects.toThrow(InsufficientStockError);
    });

    it("lanza InvalidDataError si quantity no es un entero positivo", async () => {
      await expect(inventoryService.completeReservation(PRODUCT_ID, 0)).rejects.toThrow(InvalidDataError);
    });
  });

  describe("getPage", () => {
    it("delega en findPage y enriquece con el snapshot del producto", async () => {
      const item = makeInventory();
      mockInventoryRepository.findPage.mockResolvedValue({
        items: [item],
        total: 1,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });
      mockProductRepository.findByIds.mockResolvedValue([makeProduct()]);

      const result = await inventoryService.getPage({ page: "1", limit: "50" });

      expect(mockInventoryRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        status: undefined,
        productIds: undefined,
        sortBy: undefined,
        sortOrder: "desc",
      });
      expect(result.items[0].product).toEqual({
        name: "Arroz 1kg",
        sku: "SKU-001",
        image: "https://example.com/arroz.png",
        unit: "kg",
      });
      expect(result.items[0].status).toBe("ok");
    });

    it("resuelve productIds por nombre/sku cuando hay búsqueda", async () => {
      mockProductRepository.findIdsByNameOrSku.mockResolvedValue([PRODUCT_ID]);
      mockInventoryRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });
      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await inventoryService.getPage({ page: "1", limit: "20", q: "arroz" });

      expect(mockProductRepository.findIdsByNameOrSku).toHaveBeenCalledWith("arroz");
      expect(mockInventoryRepository.findPage).toHaveBeenCalledWith(
        expect.objectContaining({ productIds: [PRODUCT_ID] })
      );
      expect(result.total).toBe(0);
    });

    it("retorna página vacía cuando la búsqueda no encuentra productos", async () => {
      mockProductRepository.findIdsByNameOrSku.mockResolvedValue([]);

      const result = await inventoryService.getPage({ page: "1", limit: "20", q: "zzz" });

      expect(mockInventoryRepository.findPage).not.toHaveBeenCalled();
      expect(result).toEqual({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 20, total: 0, pages: 1 },
      });
    });

    it("normaliza page, limit, status y sort", async () => {
      mockInventoryRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 100, total: 0, pages: 1 },
      });
      mockProductRepository.findByIds.mockResolvedValue([]);

      await inventoryService.getPage({ page: "abc", limit: "9999", status: "low-stock", sortBy: "stock", sortOrder: "asc" });

      expect(mockInventoryRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        status: "low-stock",
        productIds: undefined,
        sortBy: "stock",
        sortOrder: "asc",
      });
    });
  });

  describe("adjustInventory", () => {
    const existing = makeInventory({ stock: 10 });

    it("increase: incrementa el stock y registra el movimiento", async () => {
      const updated = makeInventory({ stock: 20 });
      mockInventoryRepository.findById.mockResolvedValue(existing);
      mockInventoryRepository.increaseById.mockResolvedValue(updated);
      mockInventoryMovementService.record.mockResolvedValue({ id: "mov" });

      const result = await inventoryService.adjustInventory(
        INVENTORY_ID,
        { operation: "increase", quantity: 10, reason: "supplier_adjustment" },
        "64b0000000000000000000f1"
      );

      expect(mockInventoryRepository.increaseById).toHaveBeenCalledWith(INVENTORY_ID, 10);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith({
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
      expect(result).toEqual({ ...updated, status: "ok" });
    });

    it("decrease: decrementa el stock y registra el movimiento", async () => {
      const updated = makeInventory({ stock: 5 });
      mockInventoryRepository.findById.mockResolvedValue(existing);
      mockInventoryRepository.decreaseById.mockResolvedValue(updated);

      await inventoryService.adjustInventory(INVENTORY_ID, { operation: "decrease", quantity: 5, reason: "manual_correction" });

      expect(mockInventoryRepository.decreaseById).toHaveBeenCalledWith(INVENTORY_ID, 5);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "decrease", previousStock: 10, newStock: 5 })
      );
    });

    it("decrease: lanza InsufficientStockError si no hay stock disponible", async () => {
      mockInventoryRepository.findById.mockResolvedValue(existing);
      mockInventoryRepository.decreaseById.mockResolvedValue(null);

      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "decrease", quantity: 50, reason: "manual_correction" })
      ).rejects.toThrow(InsufficientStockError);
      expect(mockInventoryMovementService.record).not.toHaveBeenCalled();
    });

    it("set: fija el stock absoluto y registra el movimiento", async () => {
      const updated = makeInventory({ stock: 30 });
      mockInventoryRepository.findById.mockResolvedValue(existing);
      mockInventoryRepository.setStockById.mockResolvedValue(updated);

      await inventoryService.adjustInventory(INVENTORY_ID, { operation: "set", quantity: 30, reason: "inventory_count" });

      expect(mockInventoryRepository.setStockById).toHaveBeenCalledWith(INVENTORY_ID, 30);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: "set", previousStock: 10, newStock: 30 })
      );
    });

    it("lanza InvalidDataError si reason no es un motivo válido", async () => {
      mockInventoryRepository.findById.mockResolvedValue(existing);

      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "increase", quantity: 1, reason: "hacked" as never })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "increase", quantity: 1, reason: "hacked" as never })
      ).rejects.toThrow("Invalid adjustment reason");
      expect(mockInventoryRepository.increaseById).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si quantity no es entero positivo", async () => {
      mockInventoryRepository.findById.mockResolvedValue(existing);

      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "increase", quantity: 1.5, reason: "manual_correction" })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "increase", quantity: 0, reason: "manual_correction" })
      ).rejects.toThrow(InvalidDataError);
    });

    it("lanza InvalidDataError si operation es desconocida", async () => {
      mockInventoryRepository.findById.mockResolvedValue(existing);

      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "boom" as never, quantity: 1, reason: "manual_correction" })
      ).rejects.toThrow(InvalidDataError);
    });

    it("lanza NotFoundError si el registro no existe", async () => {
      mockInventoryRepository.findById.mockResolvedValue(null);

      await expect(
        inventoryService.adjustInventory(INVENTORY_ID, { operation: "increase", quantity: 1, reason: "manual_correction" })
      ).rejects.toThrow(NotFoundError);
      expect(mockInventoryMovementService.record).not.toHaveBeenCalled();
    });
  });

  describe("changeMinStock", () => {
    it("actualiza minStock y registra movimiento min_stock_change", async () => {
      const existing = makeInventory({ stock: 10, minStock: 5 });
      const updated = makeInventory({ stock: 10, minStock: 8 });
      mockInventoryRepository.findById.mockResolvedValue(existing);
      mockInventoryRepository.setMinStockById.mockResolvedValue(updated);

      const result = await inventoryService.changeMinStock(
        INVENTORY_ID,
        { minStock: 8, reason: "manual_correction" },
        "64b0000000000000000000f1"
      );

      expect(mockInventoryRepository.setMinStockById).toHaveBeenCalledWith(INVENTORY_ID, 8);
      expect(mockInventoryMovementService.record).toHaveBeenCalledWith({
        inventoryId: INVENTORY_ID,
        productId: PRODUCT_ID,
        type: "min_stock_change",
        quantity: 0,
        previousStock: 10,
        newStock: 10,
        previousReservedStock: 0,
        newReservedStock: 0,
        reason: "manual_correction",
        createdBy: "64b0000000000000000000f1",
      });
      expect(result).toEqual({ ...updated, status: "ok" });
    });

    it("lanza InvalidDataError si minStock no es entero no negativo", async () => {
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());

      await expect(
        inventoryService.changeMinStock(INVENTORY_ID, { minStock: 2.5, reason: "manual_correction" })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        inventoryService.changeMinStock(INVENTORY_ID, { minStock: -1, reason: "manual_correction" })
      ).rejects.toThrow(InvalidDataError);
      expect(mockInventoryRepository.setMinStockById).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si reason no es válido", async () => {
      mockInventoryRepository.findById.mockResolvedValue(makeInventory());

      await expect(
        inventoryService.changeMinStock(INVENTORY_ID, { minStock: 5, reason: "hacked" as never })
      ).rejects.toThrow(InvalidDataError);
    });
  });

  describe("createForProduct", () => {
    it("crea el registro y deriva el status sin lógica de catálogo", async () => {
      mockInventoryRepository.create.mockResolvedValue(makeInventory({ stock: 15, minStock: 5 }));

      const result = await inventoryService.createForProduct({ productId: PRODUCT_ID, stock: 15, minStock: 5 });

      expect(mockInventoryRepository.create).toHaveBeenCalledWith({
        productId: PRODUCT_ID,
        stock: 15,
        minStock: 5,
      });
      expect(result).toEqual({ ...makeInventory({ stock: 15, minStock: 5 }), status: "ok" });
    });
  });

  describe("removeByProductId", () => {
    it("elimina el inventario y los movimientos asociados", async () => {
      mockInventoryRepository.deleteByProductId.mockResolvedValue(true);

      await inventoryService.removeByProductId(PRODUCT_ID);

      expect(mockInventoryRepository.deleteByProductId).toHaveBeenCalledWith(PRODUCT_ID);
      expect(mockInventoryMovementService.removeByProductId).toHaveBeenCalledWith(PRODUCT_ID);
    });
  });
});
