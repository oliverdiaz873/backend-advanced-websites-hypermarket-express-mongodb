import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestAddress } from "../helpers/address.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOrder } from "../helpers/order.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/admin/orders", () => {
  let admin: User;
  let customer: User;
  let adminHeaders: { Authorization: string };
  let customerHeaders: { Authorization: string };

  beforeEach(async () => {
    admin = await createTestAdmin();
    customer = await createTestUser();
    adminHeaders = createAuthHeaders(createAuthToken(admin));
    customerHeaders = createAuthHeaders(createAuthToken(customer));
  });

  const setupOrderWithStock = async (quantity = 2) => {
    const user = await createTestUser();
    const userHeaders = createAuthHeaders(createAuthToken(user));
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 5 });
    const address = await createTestAddress(user.id);
    await request(app).post("/api/cart/items").set(userHeaders).send({ productId: product.id, quantity });
    const created = await request(app).post("/api/orders").set(userHeaders).send({ addressId: address.id });
    return { created, product, userHeaders };
  };

  describe("GET /api/admin/orders", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/orders");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/orders").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con todas las órdenes para admin", async () => {
      const order = await createTestOrder((await createTestUser()).id, []);

      const res = await request(app).get("/api/admin/orders").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.map((o: { id: string }) => o.id)).toContain(order.id);
    });
  });

  describe("GET /api/admin/orders/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/orders/64b000000000000000000000a");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/orders/64b000000000000000000000a").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con la orden para admin", async () => {
      const order = await createTestOrder(customer.id, []);

      const res = await request(app).get(`/api/admin/orders/${order.id}`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(order.id);
    });

    it("responde 404 si la orden no existe", async () => {
      const res = await request(app).get("/api/admin/orders/64b000000000000000000000a").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/orders/:id/status", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch("/api/admin/orders/64b000000000000000000000a/status").send({ status: "processing" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const order = await createTestOrder(customer.id, []);
      const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set(customerHeaders).send({ status: "processing" });
      expect(res.status).toBe(403);
    });

    it("responde 400 si falta status", async () => {
      const order = await createTestOrder(customer.id, []);
      const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set(adminHeaders).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: status");
    });

    it("responde 400 con transición inválida para admin", async () => {
      const order = await createTestOrder(customer.id, []);
      const res = await request(app).patch(`/api/admin/orders/${order.id}/status`).set(adminHeaders).send({ status: "completed" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot transition from pending to completed");
    });

    it("responde 404 si la orden no existe", async () => {
      const res = await request(app).patch("/api/admin/orders/64b000000000000000000000a/status").set(adminHeaders).send({ status: "processing" });
      expect(res.status).toBe(404);
    });

    it("permite a admin pending → confirmed", async () => {
      const order = await createTestOrder(customer.id, []);

      const res = await request(app)
        .patch(`/api/admin/orders/${order.id}/status`)
        .set(adminHeaders)
        .send({ status: "confirmed" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("confirmed");
    });

    it("permite a admin cancelar una orden en processing y libera la reserva", async () => {
      const { created, product } = await setupOrderWithStock(2);
      const orderId = created.body.data.id;

      const toConfirmed = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: "confirmed" });
      expect(toConfirmed.status).toBe(200);

      const toProcessing = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: "processing" });
      expect(toProcessing.status).toBe(200);

      const res = await request(app)
        .patch(`/api/admin/orders/${orderId}/status`)
        .set(adminHeaders)
        .send({ status: "cancelled" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("cancelled");

      const inventory = await request(app).get(`/api/inventory/product/${product.id}`).set(adminHeaders);
      expect(inventory.body.data.availableStock).toBe(5);
    });
  });
});
