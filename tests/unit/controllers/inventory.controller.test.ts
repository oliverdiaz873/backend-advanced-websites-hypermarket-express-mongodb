import request from "supertest";
import inventoryRoutes from "../../../src/modules/inventory/routes/inventory.routes";
import { makeInventory, INVENTORY_ID } from "../factories/inventory.factory";
import { PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/inventory/services/inventory.service", () =>
  require("../mocks/repositories").mockInventoryService
);

import { mockInventoryService } from "../mocks/repositories";

const app = createTestApp("/api/inventory", inventoryRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("inventory.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/inventory", () => {
    it("responde 200 con todo el inventario", async () => {
      const records = [makeInventory()];
      mockInventoryService.getAll.mockResolvedValue(records);

      const res = await request(app).get("/api/inventory");

      expect(mockInventoryService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(records) });
    });
  });

  describe("GET /api/inventory/product/:productId", () => {
    it("responde 200 con el inventario del producto", async () => {
      const record = makeInventory();
      mockInventoryService.getByProductId.mockResolvedValue(record);

      const res = await request(app).get(`/api/inventory/product/${PRODUCT_ID}`);

      expect(mockInventoryService.getByProductId).toHaveBeenCalledWith(PRODUCT_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(record));
    });
  });

  describe("GET /api/inventory/:id", () => {
    it("responde 200 con el registro", async () => {
      const record = makeInventory();
      mockInventoryService.getById.mockResolvedValue(record);

      const res = await request(app).get(`/api/inventory/${INVENTORY_ID}`);

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

  describe("PATCH /api/inventory/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/inventory/${INVENTORY_ID}`).send({ stock: 30 });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/inventory/${INVENTORY_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ stock: 30 });

      expect(res.status).toBe(403);
    });

    it("ajusta el stock y responde 200 (admin)", async () => {
      const updated = makeInventory({ stock: 30 });
      mockInventoryService.adjustStock.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/inventory/${INVENTORY_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ stock: 30, minStock: 5 });

      expect(mockInventoryService.adjustStock).toHaveBeenCalledWith(INVENTORY_ID, { stock: 30, minStock: 5 });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });
});
