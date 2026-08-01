import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAddress } from "../helpers/address.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestUser } from "../helpers/user.helper";
import { createTestOrder } from "../helpers/order.helper";
import type { User } from "../../../src/types";

const setupCheckout = async () => {
  const user = await createTestUser();
  const headers = createAuthHeaders(createAuthToken(user));
  const product = await createTestProduct();
  await createTestInventory(product.id, { stock: 5 });
  const address = await createTestAddress(user.id);
  return { user, headers, product, address };
};

const addToCart = async (headers: { Authorization: string }, productId: string, quantity: number) => {
  await request(app).post("/api/cart/items").set(headers).send({ productId, quantity });
};

describe("E2E: /api/orders", () => {
  it("POST / crea la orden completa: decrementa stock y vacía el carrito", async () => {
    const { user, headers, product, address } = await setupCheckout();
    await addToCart(headers, product.id, 2);

    const res = await request(app).post("/api/orders").set(headers).send({ addressId: address.id });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: "pending",
      totalItems: 2,
      subtotal: product.price * 2,
    });
    expect(res.body.data.items[0]).toMatchObject({ productId: product.id, name: product.name, quantity: 2 });
    expect(res.body.data.shippingAddress).toMatchObject({ city: "Lima", country: "Peru" });

    const inventory = await request(app).get(`/api/inventory/product/${product.id}`);
    expect(inventory.body.data.availableStock).toBe(3);

    const cart = await request(app).get("/api/cart").set(headers);
    expect(cart.body.data.items).toEqual([]);
  });

  it("POST / responde 400 sin addressId", async () => {
    const { headers } = await setupCheckout();

    const res = await request(app).post("/api/orders").set(headers).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing required fields: addressId");
  });

  it("POST / responde 404 si el carrito no existe", async () => {
    const user = await createTestUser();
    const headers = createAuthHeaders(createAuthToken(user));
    const address = await createTestAddress(user.id);

    const res = await request(app).post("/api/orders").set(headers).send({ addressId: address.id });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found");
  });

  it("POST / responde 400 si el carrito está vacío", async () => {
    const user = await createTestUser();
    const headers = createAuthHeaders(createAuthToken(user));
    const address = await createTestAddress(user.id);
    await request(app).get("/api/cart").set(headers);

    const res = await request(app).post("/api/orders").set(headers).send({ addressId: address.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("POST / responde 404 si la dirección no pertenece al usuario", async () => {
    const { headers, product } = await setupCheckout();
    await addToCart(headers, product.id, 1);
    const otherUser = await createTestUser();
    const otherAddress = await createTestAddress(otherUser.id);

    const res = await request(app).post("/api/orders").set(headers).send({ addressId: otherAddress.id });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Address not found");
  });

  it("POST / responde 409 si no hay stock suficiente", async () => {
    const { user, headers, product, address } = await setupCheckout();
    await addToCart(headers, product.id, 10);

    const res = await request(app).post("/api/orders").set(headers).send({ addressId: address.id });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe(`Insufficient stock for product ${product.name}`);
  });

  it("GET / lista las órdenes del usuario", async () => {
    const { headers } = await setupCheckout();
    await createTestOrder((await createTestUser()).id, []);
    const user = await createTestUser();
    const order = await createTestOrder(user.id, []);
    const ownHeaders = createAuthHeaders(createAuthToken(user));

    const res = await request(app).get("/api/orders").set(ownHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((o: { id: string }) => o.id)).toEqual([order.id]);
  });

  it("GET /:id devuelve la orden propia y 404 para la ajena o inexistente", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const order = await createTestOrder(user.id, []);
    const userHeaders = createAuthHeaders(createAuthToken(user));
    const otherHeaders = createAuthHeaders(createAuthToken(other));

    const own = await request(app).get(`/api/orders/${order.id}`).set(userHeaders);
    expect(own.status).toBe(200);
    expect(own.body.data.id).toBe(order.id);

    const otherUser = await request(app).get(`/api/orders/${order.id}`).set(otherHeaders);
    expect(otherUser.status).toBe(404);

    const missing = await request(app).get("/api/orders/64b000000000000000000000a").set(userHeaders);
    expect(missing.status).toBe(404);
  });

  it("PATCH /:id/status transiciona pending → processing", async () => {
    const { headers, user } = await setupCheckout();
    const order = await createTestOrder(user.id, []);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set(headers)
      .send({ status: "processing" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("processing");
  });

  it("PATCH /:id/status responde 400 con transición inválida", async () => {
    const { headers, user } = await setupCheckout();
    const order = await createTestOrder(user.id, []);

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set(headers)
      .send({ status: "completed" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cannot transition from pending to completed");
  });

  it("PATCH /:id/status cancelar restaura el stock", async () => {
    const { headers, product, user } = await setupCheckout();
    await addToCart(headers, product.id, 2);
    const created = await request(app).post("/api/orders").set(headers).send({ addressId: (await createTestAddress(user.id)).id });

    const res = await request(app)
      .patch(`/api/orders/${created.body.data.id}/status`)
      .set(headers)
      .send({ status: "cancelled" });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");

    const inventory = await request(app).get(`/api/inventory/product/${product.id}`);
    expect(inventory.body.data.availableStock).toBe(5);
  });

  it("PATCH /:id/status responde 404 para la orden ajena", async () => {
    const user = await createTestUser();
    const other = await createTestUser();
    const order = await createTestOrder(other.id, []);
    const headers = createAuthHeaders(createAuthToken(user));

    const res = await request(app)
      .patch(`/api/orders/${order.id}/status`)
      .set(headers)
      .send({ status: "processing" });

    expect(res.status).toBe(404);
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).post("/api/orders").send({ addressId: "x" });

    expect(res.status).toBe(401);
  });
});
