import request from "supertest";
import orderRoutes from "../../../src/modules/orders/routes/order.routes";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InsufficientStockError } from "../../../src/shared/errors/insufficient-stock.error";
import { makeOrder, ORDER_ID } from "../factories/order.factory";
import { USER_ID } from "../factories/user.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/orders/services/order.service", () =>
  require("../mocks/repositories").mockOrderService
);

import { mockOrderService } from "../mocks/repositories";

const app = createTestApp("/api/orders", orderRoutes);
const authToken = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

describe("order.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/orders");

    expect(res.status).toBe(401);
  });

  describe("POST /api/orders", () => {
    it("responde 400 si falta addressId", async () => {
      const res = await request(app).post("/api/orders").set("Authorization", `Bearer ${authToken}`).send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: addressId");
    });

    it("crea la orden y responde 201", async () => {
      const order = makeOrder();
      mockOrderService.create.mockResolvedValue(order);

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ addressId: "64b0000000000000000000e1" });

      expect(mockOrderService.create).toHaveBeenCalledWith(USER_ID, "64b0000000000000000000e1");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(order) });
    });

    it("responde 400 si el carrito está vacío", async () => {
      mockOrderService.create.mockRejectedValue(new InvalidDataError("Cart is empty"));

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ addressId: "64b0000000000000000000e1" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cart is empty");
    });

    it("responde 409 si no hay stock suficiente", async () => {
      mockOrderService.create.mockRejectedValue(new InsufficientStockError("Insufficient stock"));

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ addressId: "64b0000000000000000000e1" });

      expect(res.status).toBe(409);
      expect(res.body.statusCode).toBe(409);
    });

    it("responde 404 si la dirección no existe", async () => {
      mockOrderService.create.mockRejectedValue(new NotFoundError("Address not found"));

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ addressId: "inexistente" });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Address not found", statusCode: 404, code: "NOT_FOUND" });
    });
  });

  describe("GET /api/orders", () => {
    it("responde 200 con las órdenes del usuario", async () => {
      const orders = [makeOrder()];
      mockOrderService.findByUser.mockResolvedValue(orders);

      const res = await request(app).get("/api/orders").set("Authorization", `Bearer ${authToken}`);

      expect(mockOrderService.findByUser).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(orders) });
    });
  });

  describe("GET /api/orders/:id", () => {
    it("responde 200 con la orden", async () => {
      const order = makeOrder();
      mockOrderService.findById.mockResolvedValue(order);

      const res = await request(app).get(`/api/orders/${ORDER_ID}`).set("Authorization", `Bearer ${authToken}`);

      expect(mockOrderService.findById).toHaveBeenCalledWith(USER_ID, ORDER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(order));
    });

    it("responde 404 si la orden no existe", async () => {
      mockOrderService.findById.mockRejectedValue(new NotFoundError("Order not found"));

      const res = await request(app).get(`/api/orders/${ORDER_ID}`).set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Order not found");
    });
  });

  describe("PATCH /api/orders/:id/status", () => {
    it("responde 400 si falta status", async () => {
      const res = await request(app)
        .patch(`/api/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: status");
    });

    it("actualiza el estado y responde 200", async () => {
      const updated = makeOrder({ status: "processing" });
      mockOrderService.updateStatus.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "processing" });

      expect(mockOrderService.updateStatus).toHaveBeenCalledWith(USER_ID, ORDER_ID, "processing");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });

    it("responde 400 si la transición es inválida", async () => {
      mockOrderService.updateStatus.mockRejectedValue(
        new InvalidDataError("Cannot transition from pending to completed")
      );

      const res = await request(app)
        .patch(`/api/orders/${ORDER_ID}/status`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ status: "completed" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot transition from pending to completed");
    });
  });
});
