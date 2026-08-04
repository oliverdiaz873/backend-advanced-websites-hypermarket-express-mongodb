import request from "supertest";
import inventoryRoutes from "../../../src/modules/inventory/routes/inventory.routes";
import { makeInventory, INVENTORY_ID } from "../factories/inventory.factory";
import { makeMovement } from "../factories/inventory-movement.factory";
import { PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/inventory/services/inventory.service", () =>
  require("../mocks/repositories").mockInventoryService
);
jest.mock("../../../src/modules/inventory-movements/services/inventory-movement.service", () =>
  require("../mocks/repositories").mockInventoryMovementService
);

import { mockInventoryService, mockInventoryMovementService } from "../mocks/repositories";

const app = createTestApp("/api/inventory", inventoryRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });
const actorId = "64b000000000000000000002";

describe("inventory.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/inventory", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/inventory");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app).get("/api/inventory").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el inventario paginado (admin)", async () => {
      const records = [makeInventory()];
      mockInventoryService.getPage.mockResolvedValue({
        items: records,
        total: 1,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });

      const res = await request(app).get("/api/inventory").set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryService.getPage).toHaveBeenCalledWith(expect.any(Object));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: toJson(records),
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });
    });
  });

  describe("GET /api/inventory/product/:productId", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get(`/api/inventory/product/${PRODUCT_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get(`/api/inventory/product/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el inventario del producto (admin)", async () => {
      const record = makeInventory();
      mockInventoryService.getByProductId.mockResolvedValue(record);

      const res = await request(app)
        .get(`/api/inventory/product/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryService.getByProductId).toHaveBeenCalledWith(PRODUCT_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(record));
    });
  });

  describe("GET /api/inventory/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get(`/api/inventory/${INVENTORY_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get(`/api/inventory/${INVENTORY_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el registro (admin)", async () => {
      const record = makeInventory();
      mockInventoryService.getById.mockResolvedValue(record);

      const res = await request(app)
        .get(`/api/inventory/${INVENTORY_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryService.getById).toHaveBeenCalledWith(INVENTORY_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(record));
    });
  });

  describe("GET /api/inventory/low-stock", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/inventory/low-stock");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get("/api/inventory/low-stock")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con los productos de bajo stock (admin)", async () => {
      const records = [makeInventory({ stock: 5 })];
      mockInventoryService.getLowStock.mockResolvedValue(records);

      const res = await request(app)
        .get("/api/inventory/low-stock")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryService.getLowStock).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(records));
    });
  });

  describe("GET /api/inventory/out-of-stock", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/inventory/out-of-stock");

      expect(res.status).toBe(401);
    });

    it("responde 200 con los productos agotados (admin)", async () => {
      const records = [makeInventory({ stock: 0 })];
      mockInventoryService.getOutOfStock.mockResolvedValue(records);

      const res = await request(app)
        .get("/api/inventory/out-of-stock")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryService.getOutOfStock).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(records));
    });
  });

  describe("POST /api/inventory/:id/adjust", () => {
    const body = { operation: "increase", quantity: 10, reason: "supplier_adjustment" };

    it("responde 401 sin token", async () => {
      const res = await request(app).post(`/api/inventory/${INVENTORY_ID}/adjust`).send(body);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post(`/api/inventory/${INVENTORY_ID}/adjust`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send(body);

      expect(res.status).toBe(403);
    });

    it("ajusta el stock y responde 200 (admin)", async () => {
      const updated = makeInventory({ stock: 60 });
      mockInventoryService.adjustInventory.mockResolvedValue(updated);

      const res = await request(app)
        .post(`/api/inventory/${INVENTORY_ID}/adjust`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(body);

      expect(mockInventoryService.adjustInventory).toHaveBeenCalledWith(INVENTORY_ID, body, actorId);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("PATCH /api/inventory/:id/min-stock", () => {
    const body = { minStock: 8, reason: "manual_correction" };

    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/inventory/${INVENTORY_ID}/min-stock`).send(body);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/inventory/${INVENTORY_ID}/min-stock`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send(body);

      expect(res.status).toBe(403);
    });

    it("cambia el mínimo y responde 200 (admin)", async () => {
      const updated = makeInventory({ minStock: 8 });
      mockInventoryService.changeMinStock.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/inventory/${INVENTORY_ID}/min-stock`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(body);

      expect(mockInventoryService.changeMinStock).toHaveBeenCalledWith(
        INVENTORY_ID,
        { minStock: 8, reason: "manual_correction" },
        actorId
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("GET /api/inventory/:id/movements", () => {
    it("responde 200 con el historial paginado (admin)", async () => {
      const movement = makeMovement();
      mockInventoryMovementService.getByInventoryId.mockResolvedValue({
        data: [movement],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });

      const res = await request(app)
        .get(`/api/inventory/${INVENTORY_ID}/movements`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryMovementService.getByInventoryId).toHaveBeenCalledWith(INVENTORY_ID, 1, 50);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: toJson([movement]),
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });
    });
  });
});
