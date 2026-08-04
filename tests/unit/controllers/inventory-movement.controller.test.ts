import request from "supertest";
import inventoryMovementRoutes from "../../../src/modules/inventory-movements/routes/inventory-movement.routes";
import { makeMovement } from "../factories/inventory-movement.factory";
import { PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/inventory-movements/services/inventory-movement.service", () =>
  require("../mocks/repositories").mockInventoryMovementService
);

import { mockInventoryMovementService } from "../mocks/repositories";

const app = createTestApp("/api/inventory-movements", inventoryMovementRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("inventory-movement.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/inventory-movements", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/inventory-movements");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get("/api/inventory-movements")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el historial paginado (admin)", async () => {
      const movement = makeMovement();
      mockInventoryMovementService.getPage.mockResolvedValue({
        data: [movement],
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });

      const res = await request(app)
        .get("/api/inventory-movements")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryMovementService.getPage).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        productId: undefined,
        type: undefined,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: toJson([movement]),
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });
    });

    it("propaga los filtros productId y type", async () => {
      mockInventoryMovementService.getPage.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 1 },
      });

      const res = await request(app)
        .get(`/api/inventory-movements?productId=${PRODUCT_ID}&type=decrease`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryMovementService.getPage).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        productId: PRODUCT_ID,
        type: "decrease",
      });
      expect(res.status).toBe(200);
    });

    it("descarta type inválido", async () => {
      mockInventoryMovementService.getPage.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 50, total: 0, pages: 1 },
      });

      await request(app)
        .get("/api/inventory-movements?type=hacked")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockInventoryMovementService.getPage).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        productId: undefined,
        type: undefined,
      });
    });
  });
});
