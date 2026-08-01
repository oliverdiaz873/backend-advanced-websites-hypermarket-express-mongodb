import request from "supertest";
import adminOrderRoutes from "../../../src/modules/orders/routes/admin-order.routes";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeOrder, ORDER_ID } from "../factories/order.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/orders/services/order.service", () =>
  require("../mocks/repositories").mockOrderService
);

import { mockOrderService } from "../mocks/repositories";

const app = createTestApp("/api/admin/orders", adminOrderRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("order.admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/orders", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/orders");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(mockOrderService.findAllAdmin).not.toHaveBeenCalled();
    });

    it("responde 200 con todas las órdenes (admin)", async () => {
      const orders = [makeOrder()];
      mockOrderService.findAllAdmin.mockResolvedValue(orders);

      const res = await request(app).get("/api/admin/orders").set("Authorization", `Bearer ${adminToken}`);

      expect(mockOrderService.findAllAdmin).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(orders) });
    });
  });

  describe("GET /api/admin/orders/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get(`/api/admin/orders/${ORDER_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get(`/api/admin/orders/${ORDER_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con la orden (admin)", async () => {
      const order = makeOrder();
      mockOrderService.findByIdAdmin.mockResolvedValue(order);

      const res = await request(app)
        .get(`/api/admin/orders/${ORDER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockOrderService.findByIdAdmin).toHaveBeenCalledWith(ORDER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(order));
    });

    it("responde 404 si la orden no existe", async () => {
      mockOrderService.findByIdAdmin.mockRejectedValue(new NotFoundError("Order not found"));

      const res = await request(app)
        .get(`/api/admin/orders/${ORDER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });

  describe("PATCH /api/admin/orders/:id/status", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .send({ status: "processing" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "processing" });

      expect(res.status).toBe(403);
    });

    it("responde 400 si falta status", async () => {
      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: status");
    });

    it("actualiza el estado y responde 200 (admin)", async () => {
      const updated = makeOrder({ status: "processing" });
      mockOrderService.updateStatusAdmin.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "processing" });

      expect(mockOrderService.updateStatusAdmin).toHaveBeenCalledWith(ORDER_ID, "processing");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });

    it("responde 400 si la transición es inválida para admin", async () => {
      mockOrderService.updateStatusAdmin.mockRejectedValue(
        new InvalidDataError("Cannot transition from pending to completed")
      );

      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "completed" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot transition from pending to completed");
    });

    it("responde 404 si la orden no existe", async () => {
      mockOrderService.updateStatusAdmin.mockRejectedValue(new NotFoundError("Order not found"));

      const res = await request(app)
        .patch(`/api/admin/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "processing" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });
});
