import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOffer } from "../helpers/offer.helper";
import { createTestUser } from "../helpers/user.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/cart", () => {
  let user: User;
  let token: string;
  let headers: { Authorization: string };

  beforeEach(async () => {
    user = await createTestUser();
    token = createAuthToken(user);
    headers = createAuthHeaders(token);
  });

  it("GET / responde 200 con carrito vacío (se crea automáticamente)", async () => {
    const res = await request(app).get("/api/cart").set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.totalItems).toBe(0);
  });

  it("POST /items agrega un producto (quantity por defecto 1)", async () => {
    const product = await createTestProduct();

    const res = await request(app)
      .post("/api/cart/items")
      .set(headers)
      .send({ productId: product.id });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([
      expect.objectContaining({ productId: product.id, name: product.name, quantity: 1 }),
    ]);
    expect(res.body.data.subtotal).toBe(product.price);
  });

  it("POST /items acumula cantidades del mismo producto", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id, quantity: 2 });

    const res = await request(app).post("/api/cart/items").set(headers).send({ productId: product.id, quantity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(5);
  });

  it("POST /items responde 400 sin productId", async () => {
    const res = await request(app).post("/api/cart/items").set(headers).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing required fields: productId");
  });

  it("POST /items responde 400 con quantity 0", async () => {
    const product = await createTestProduct();

    const res = await request(app).post("/api/cart/items").set(headers).send({ productId: product.id, quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Quantity must be a positive integer");
  });

  it("POST /items responde 404 si el producto no existe", async () => {
    const res = await request(app).post("/api/cart/items").set(headers).send({ productId: "prod_inexistente" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });

  it("POST /items responde 400 si el producto no está disponible", async () => {
    const product = await createTestProduct({ isAvailable: false });

    const res = await request(app).post("/api/cart/items").set(headers).send({ productId: product.id });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Product is not available");
  });

  it("PATCH /items/:productId actualiza la cantidad", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id, quantity: 2 });

    const res = await request(app)
      .patch(`/api/cart/items/${product.id}`)
      .set(headers)
      .send({ quantity: 7 });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(7);
  });

  it("PATCH /items/:productId responde 400 sin quantity", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id });

    const res = await request(app).patch(`/api/cart/items/${product.id}`).set(headers).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Quantity must be a positive integer");
  });

  it("DELETE /items/:productId elimina el item", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id });

    const res = await request(app).delete(`/api/cart/items/${product.id}`).set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it("DELETE /items/:productId responde 404 si el item no existe (con carrito creado)", async () => {
    await request(app).get("/api/cart").set(headers);

    const res = await request(app).delete("/api/cart/items/prod_inexistente").set(headers);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart item not found");
  });

  it("DELETE / vacía el carrito", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id });

    const res = await request(app).delete("/api/cart").set(headers);

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([]);
  });

  it("respuesta 401 sin token", async () => {
    const res = await request(app).get("/api/cart");

    expect(res.status).toBe(401);
  });

  it("POST /merge acumula items y aplica la oferta activa (snapshot server-side)", async () => {
    const product = await createTestProduct();
    await createTestOffer(product.id);

    const res = await request(app).post("/api/cart/merge").set(headers).send({
      items: [{ productId: product.id, quantity: 3 }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0]).toMatchObject({
      productId: product.id,
      quantity: 3,
      unitPrice: 80,
      originalPrice: 100,
      discountPercentage: 20,
      isOffer: true,
    });
    expect(res.body.data.subtotal).toBe(240);
  });

  it("POST /merge acumula sobre items ya existentes en el carrito", async () => {
    const product = await createTestProduct();
    await request(app).post("/api/cart/items").set(headers).send({ productId: product.id, quantity: 2 });

    const res = await request(app)
      .post("/api/cart/merge")
      .set(headers)
      .send({ items: [{ productId: product.id, quantity: 4 }] });

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].quantity).toBe(6);
    expect(res.body.data.items[0].unitPrice).toBe(product.price);
    expect(res.body.data.items[0].isOffer).toBe(false);
  });

  it("POST /merge descarta ghost (producto inexistente) y no disponible", async () => {
    const available = await createTestProduct();
    const unavailable = await createTestProduct({ isAvailable: false });

    const res = await request(app).post("/api/cart/merge").set(headers).send({
      items: [
        { productId: available.id, quantity: 1 },
        { productId: "prod_fantasma", quantity: 2 },
        { productId: unavailable.id, quantity: 1 },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toEqual([
      expect.objectContaining({ productId: available.id, quantity: 1 }),
    ]);
  });

  it("POST /merge responde 400 si items no es un array", async () => {
    const res = await request(app).post("/api/cart/merge").set(headers).send({ items: "nope" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("items must be an array");
  });

  it("POST /merge responde 400 si alguna cantidad no es un entero positivo", async () => {
    const product = await createTestProduct();

    const res = await request(app)
      .post("/api/cart/merge")
      .set(headers)
      .send({ items: [{ productId: product.id, quantity: 0 }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Quantity must be a positive integer");
  });
});
