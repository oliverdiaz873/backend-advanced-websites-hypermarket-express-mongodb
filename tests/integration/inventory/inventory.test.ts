import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/inventory", () => {
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

  it("GET / responde 200 con el inventario (admin)", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 5 });

    const res = await request(app).get("/api/inventory").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: string }) => r.id)).toContain(inventory.id);
  });

  it("GET /product/:productId responde 200 (admin)", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 8 });

    const res = await request(app).get(`/api/inventory/product/${product.id}`).set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.availableStock).toBe(8);
  });

  it("GET /product/:productId responde 404 si no existe (admin)", async () => {
    const res = await request(app).get("/api/inventory/product/prod_inexistente").set(adminHeaders);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Inventory not found");
  });

  it("GET /:id responde 200 y 404 si no existe (admin)", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const ok = await request(app).get(`/api/inventory/${inventory.id}`).set(adminHeaders);
    expect(ok.status).toBe(200);
    expect(ok.body.data.id).toBe(inventory.id);

    const missing = await request(app).get("/api/inventory/64b00000000000000000000a").set(adminHeaders);
    expect(missing.status).toBe(404);
  });

  it("GETs del inventario responde 401 sin token y 403 para customer", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id);

    for (const path of ["/api/inventory", `/api/inventory/product/${product.id}`, "/api/inventory/64b00000000000000000000a"]) {
      const unauth = await request(app).get(path);
      expect(unauth.status).toBe(401);

      const forbidden = await request(app).get(path).set(customerHeaders);
      expect(forbidden.status).toBe(403);
    }
  });

  it("GET /low-stock responde 200 para admin con solo los registros en mínimo", async () => {
    const low = await createTestProduct();
    const ok = await createTestProduct();
    await createTestInventory(low.id, { stock: 2, minStock: 5 });
    await createTestInventory(ok.id, { stock: 10, minStock: 5 });

    const res = await request(app).get("/api/inventory/low-stock").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { productId: string }) => r.productId)).toContain(low.id);
    expect(res.body.data.map((r: { productId: string }) => r.productId)).not.toContain(ok.id);
  });

  it("GET /low-stock responde 403 para customer y 401 sin token", async () => {
    const forbidden = await request(app).get("/api/inventory/low-stock").set(customerHeaders);
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(app).get("/api/inventory/low-stock");
    expect(unauthenticated.status).toBe(401);
  });

  it("PATCH /:id ajusta stock para admin", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const res = await request(app)
      .patch(`/api/inventory/${inventory.id}`)
      .set(adminHeaders)
      .send({ stock: 25, minStock: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(25);
    expect(res.body.data.minStock).toBe(5);
  });

  it("PATCH /:id responde 400 con stock inválido", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const res = await request(app)
      .patch(`/api/inventory/${inventory.id}`)
      .set(adminHeaders)
      .send({ stock: -1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Stock must be a non-negative integer");
  });

  it("PATCH /:id responde 403 para customer", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const res = await request(app).patch(`/api/inventory/${inventory.id}`).set(customerHeaders).send({ stock: 1 });

    expect(res.status).toBe(403);
  });

  it("PATCH /:id responde 404 si el registro no existe", async () => {
    const res = await request(app)
      .patch("/api/inventory/64b00000000000000000000a")
      .set(adminHeaders)
      .send({ stock: 1 });

    expect(res.status).toBe(404);
  });
});
