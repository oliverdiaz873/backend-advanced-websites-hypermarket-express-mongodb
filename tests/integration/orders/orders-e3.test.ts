import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAddress } from "../helpers/address.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOffer } from "../helpers/offer.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import type { User } from "../../../src/types";

const setupCheckout = async (stock = 5) => {
  const user = await createTestUser();
  const headers = createAuthHeaders(createAuthToken(user));
  const product = await createTestProduct({ unit: "kg", unitQuantity: 1 });
  await createTestInventory(product.id, { stock });
  const address = await createTestAddress(user.id);
  return { user, headers, product, address };
};

const addToCart = async (headers: { Authorization: string }, productId: string, quantity: number) => {
  await request(app).post("/api/cart/items").set(headers).send({ productId, quantity });
};

describe("E3 /api/orders — idempotencia, orderNumber, snapshot y payment stub", () => {
  describe("idempotencia (D1)", () => {
    it("doble-POST con la misma idempotencyKey crea UNA sola orden", async () => {
      const { headers, product, user } = await setupCheckout();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 2);

      const payload = { addressId: address.id, idempotencyKey: "key-do-si", };
      const first = await request(app).post("/api/orders").set(headers).send(payload);
      expect(first.status).toBe(201);

      const second = await request(app).post("/api/orders").set(headers).send(payload);
      expect(second.status).toBe(201);
      expect(second.body.data.id).toBe(first.body.data.id);
      expect(second.body.data.status).toBe("pending");
      expect(second.body.data.idempotencyKey).toBe("key-do-si");
    });

    it("retry tras el clearCart devuelve la orden existente, no 'Cart is empty'", async () => {
      const { headers, product, user } = await setupCheckout();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 1);

      const payload = { addressId: address.id, idempotencyKey: "key-retry", };
      const first = await request(app).post("/api/orders").set(headers).send(payload);
      expect(first.status).toBe(201);

      const retry = await request(app).post("/api/orders").set(headers).send(payload);
      expect(retry.status).toBe(201);
      expect(retry.body.data.id).toBe(first.body.data.id);
    });

    it("POST sin idempotencyKey responde 400", async () => {
      const { headers, product } = await setupCheckout();
      const user = await createTestUser();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 1);

      const res = await request(app).post("/api/orders").set(headers).send({ addressId: address.id });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain("idempotencyKey");
    });

    it("doble-POST concurrente con la misma clave: una reserva, una orden", async () => {
      const { user, headers, product } = await setupCheckout(100);
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 5);
      const admin = await createTestAdmin();
      const adminHeaders = createAuthHeaders(createAuthToken(admin));
      const payload = { addressId: address.id, idempotencyKey: "key-concurrente" };

      const [a, b] = await Promise.all([
        request(app).post("/api/orders").set(headers).send(payload),
        request(app).post("/api/orders").set(headers).send(payload),
      ]);

      expect([a.status, b.status].sort()).toEqual([201, 201]);
      expect(a.body.data.id).toBe(b.body.data.id);

      const inventory = await request(app).get(`/api/inventory/product/${product.id}`).set(adminHeaders);
      expect(inventory.body.data.availableStock).toBe(95);
    });
  });

  describe("orderNumber (D2)", () => {
    it("POST devuelve un orderNumber legible y único", async () => {
      const { headers, product, user } = await setupCheckout();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 1);

      const created = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-num-1" });
      expect(created.status).toBe(201);
      expect(created.body.data.orderNumber).toMatch(/^HM-\d{8}-[A-F0-9]{6}$/);

      await addToCart(headers, product.id, 1);
      const again = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-num-2" });
      expect(again.status).toBe(201);
      expect(again.body.data.orderNumber).not.toBe(created.body.data.orderNumber);
    });
  });

  describe("snapshot de oferta en OrderItem (D4)", () => {
    it("la orden conserva originalPrice/discountPercentage/unit del snapshot del carrito", async () => {
      const { user, headers, product, address } = await setupCheckout();
      await createTestOffer(product.id, { originalPrice: 100, discountPrice: 80 });
      await addToCart(headers, product.id, 2);

      const orderRes = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-offer" });

      expect(orderRes.status).toBe(201);
      const item = orderRes.body.data.items[0];
      expect(item.price).toBe(80);
      expect(item.originalPrice).toBe(100);
      expect(item.discountPercentage).toBe(20);
      expect(item.unit).toBe("kg");
      expect(item.unitQuantity).toBe(1);
      expect(orderRes.body.data.subtotal).toBe(160);
    });

    it("sin oferta, el item no inventa descuento", async () => {
      const { headers, product, user } = await setupCheckout();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 1);

      const orderRes = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-no-offer" });

      expect(orderRes.status).toBe(201);
      const item = orderRes.body.data.items[0];
      expect(item.price).toBe(product.price);
      expect(item.originalPrice).toBeUndefined();
      expect(item.discountPercentage).toBeUndefined();
    });
  });

  describe("stock (D5)", () => {
    it("producto sin registro de inventario responde 409, no 404", async () => {
      const user = await createTestUser();
      const headers = createAuthHeaders(createAuthToken(user));
      const product = await createTestProduct();
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 1);

      const res = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-no-inv" });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });

    it("stock insuficiente en una de varias líneas: 409 y ninguna reserva hecha", async () => {
      const user = await createTestUser();
      const headers = createAuthHeaders(createAuthToken(user));
      const address = await createTestAddress(user.id);
      const admin = await createTestAdmin();
      const adminHeaders = createAuthHeaders(createAuthToken(admin));

      const good = await createTestProduct({ unit: "kg", unitQuantity: 1 });
      const scarce = await createTestProduct({ unit: "kg", unitQuantity: 1 });
      await createTestInventory(good.id, { stock: 10 });
      await createTestInventory(scarce.id, { stock: 1 });

      await addToCart(headers, good.id, 3);
      await addToCart(headers, scarce.id, 5);

      const res = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-stock-mixto" });

      expect(res.status).toBe(409);

      const goodInv = await request(app).get(`/api/inventory/product/${good.id}`).set(adminHeaders);
      expect(goodInv.body.data.reservedStock).toBe(0);
      expect(goodInv.body.data.availableStock).toBe(10);
      const scarceInv = await request(app).get(`/api/inventory/product/${scarce.id}`).set(adminHeaders);
      expect(scarceInv.body.data.reservedStock).toBe(0);

      const orders = await request(app).get("/api/orders").set(headers);
      expect(orders.body.data).toHaveLength(0);
    });
  });

  describe("payment stub (D3)", () => {
    it("POST /:id/pay transiciona pending -> paid", async () => {
      const { user, headers, product, address } = await setupCheckout();
      await addToCart(headers, product.id, 1);
      const created = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-pay" });
      const orderId = created.body.data.id;

      const paid = await request(app).post(`/api/orders/${orderId}/pay`).set(headers);
      expect(paid.status).toBe(200);
      expect(paid.body.data.paymentStatus).toBe("paid");
    });

    it("no se puede pagar dos veces (paid -> invalid)", async () => {
      const { user, headers, product, address } = await setupCheckout();
      await addToCart(headers, product.id, 1);
      const created = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-pay-2" });
      const orderId = created.body.data.id;

      await request(app).post(`/api/orders/${orderId}/pay`).set(headers);
      const again = await request(app).post(`/api/orders/${orderId}/pay`).set(headers);
      expect(again.status).toBe(400);
    });

    it("cancelar una orden pagada deja paymentStatus en refunded y libera la reserva", async () => {
      const { user, headers, product } = await setupCheckout(5);
      const address = await createTestAddress(user.id);
      await addToCart(headers, product.id, 2);
      const admin = await createTestAdmin();
      const adminHeaders = createAuthHeaders(createAuthToken(admin));

      const created = await request(app)
        .post("/api/orders")
        .set(headers)
        .send({ addressId: address.id, idempotencyKey: "key-refund" });
      const orderId = created.body.data.id;
      await request(app).post(`/api/orders/${orderId}/pay`).set(headers);

      const cancelled = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set(headers)
        .send({ status: "cancelled" });

      expect(cancelled.status).toBe(200);
      expect(cancelled.body.data.status).toBe("cancelled");
      expect(cancelled.body.data.paymentStatus).toBe("refunded");

      const inventory = await request(app).get(`/api/inventory/product/${product.id}`).set(adminHeaders);
      expect(inventory.body.data.availableStock).toBe(5);
    });

    it("pay responde 404 para orden ajena", async () => {
      const owner = await createTestUser();
      const orderRes = await createTestOrderFor(owner);
      const other = await createTestUser();
      const otherHeaders = createAuthHeaders(createAuthToken(other));

      const res = await request(app).post(`/api/orders/${orderRes.id}/pay`).set(otherHeaders);
      expect(res.status).toBe(404);
    });
  });
});

const createTestOrderFor = async (user: User): Promise<{ id: string }> => {
  const headers = createAuthHeaders(createAuthToken(user));
  const product = await createTestProduct();
  await createTestInventory(product.id, { stock: 5 });
  const address = await createTestAddress(user.id);
  await addToCart(headers, product.id, 1);
  const created = await request(app)
    .post("/api/orders")
    .set(headers)
    .send({ addressId: address.id, idempotencyKey: `key-${Date.now()}-${Math.random()}` });
  return created.body.data;
};