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

  it("GET / responde 200 con el inventario paginado (admin)", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 5 });

    const res = await request(app).get("/api/inventory").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { id: string }) => r.id)).toContain(inventory.id);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].product).toBeDefined();
  });

  it("GET / responde 200 con filtros de estado y búsqueda", async () => {
    const low = await createTestProduct();
    const out = await createTestProduct();
    await createTestInventory(low.id, { stock: 2, minStock: 5 });
    await createTestInventory(out.id, { stock: 0 });

    const lowRes = await request(app).get("/api/inventory?status=low-stock").set(adminHeaders);
    expect(lowRes.status).toBe(200);
    expect(lowRes.body.data.map((r: { productId: string }) => r.productId)).toContain(low.id);
    expect(lowRes.body.data.map((r: { productId: string }) => r.productId)).not.toContain(out.id);

    const qRes = await request(app).get(`/api/inventory?q=${low.name.slice(0, 5)}`).set(adminHeaders);
    expect(qRes.status).toBe(200);
    expect(qRes.body.data.map((r: { productId: string }) => r.productId)).toContain(low.id);
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

  it("GET /out-of-stock responde 200 con solo los agotados", async () => {
    const out = await createTestProduct();
    const ok = await createTestProduct();
    await createTestInventory(out.id, { stock: 0 });
    await createTestInventory(ok.id, { stock: 10, minStock: 5 });

    const res = await request(app).get("/api/inventory/out-of-stock").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { productId: string }) => r.productId)).toContain(out.id);
    expect(res.body.data.map((r: { productId: string }) => r.productId)).not.toContain(ok.id);
  });

  it("GET /low-stock responde 403 para customer y 401 sin token", async () => {
    const forbidden = await request(app).get("/api/inventory/low-stock").set(customerHeaders);
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(app).get("/api/inventory/low-stock");
    expect(unauthenticated.status).toBe(401);
  });

  it("POST /:id/adjust aumenta el stock y persiste el movimiento", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 10 });

    const res = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "increase", quantity: 5, reason: "supplier_adjustment" });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(15);

    const movements = await request(app).get(`/api/inventory/${inventory.id}/movements`).set(adminHeaders);
    expect(movements.status).toBe(200);
    expect(movements.body.data).toHaveLength(1);
    expect(movements.body.data[0]).toMatchObject({
      type: "increase",
      quantity: 5,
      previousStock: 10,
      newStock: 15,
      reason: "supplier_adjustment",
      createdBy: admin.id,
    });
  });

  it("POST /:id/adjust decrease decrementa y respeta el guard de stock", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 5 });

    const ok = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "decrease", quantity: 3, reason: "manual_correction" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.stock).toBe(2);

    const blocked = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "decrease", quantity: 50, reason: "manual_correction" });
    expect(blocked.status).toBe(409);

    const movements = await request(app).get(`/api/inventory/${inventory.id}/movements`).set(adminHeaders);
    expect(movements.body.data).toHaveLength(1);
  });

  it("POST /:id/adjust set fija el stock absoluto", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 10 });

    const res = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "set", quantity: 30, reason: "inventory_count" });

    expect(res.status).toBe(200);
    expect(res.body.data.stock).toBe(30);
  });

  it("POST /:id/adjust responde 400 con reason inválido", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const res = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "increase", quantity: 1, reason: "hacked" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid adjustment reason");
  });

  it("POST /:id/adjust responde 404 si el registro no existe", async () => {
    const res = await request(app)
      .post("/api/inventory/64b00000000000000000000a/adjust")
      .set(adminHeaders)
      .send({ operation: "increase", quantity: 1, reason: "manual_correction" });

    expect(res.status).toBe(404);
  });

  it("POST /:id/adjust responde 403 para customer y 401 sin token", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);
    const body = { operation: "increase", quantity: 1, reason: "manual_correction" };

    const forbidden = await request(app).post(`/api/inventory/${inventory.id}/adjust`).set(customerHeaders).send(body);
    expect(forbidden.status).toBe(403);

    const unauthenticated = await request(app).post(`/api/inventory/${inventory.id}/adjust`).send(body);
    expect(unauthenticated.status).toBe(401);
  });

  it("POST /:id/adjust aumentos consecutivos no sobrescriben el stock (concurrencia)", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 10 });

    const first = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "increase", quantity: 10, reason: "supplier_adjustment" });
    expect(first.status).toBe(200);
    expect(first.body.data.stock).toBe(20);

    const second = await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation: "increase", quantity: 5, reason: "supplier_adjustment" });
    expect(second.status).toBe(200);

    const final = await request(app).get(`/api/inventory/${inventory.id}`).set(adminHeaders);
    expect(final.body.data.stock).toBe(25);
    expect(final.body.data.stock).toBe(10 + 10 + 5);

    const movements = await request(app).get(`/api/inventory/${inventory.id}/movements`).set(adminHeaders);
    expect(movements.body.data).toHaveLength(2);
  });

  it("PATCH /:id/min-stock cambia el mínimo y registra movimiento", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { minStock: 5 });

    const res = await request(app)
      .patch(`/api/inventory/${inventory.id}/min-stock`)
      .set(adminHeaders)
      .send({ minStock: 8, reason: "manual_correction" });

    expect(res.status).toBe(200);
    expect(res.body.data.minStock).toBe(8);

    const movements = await request(app).get(`/api/inventory/${inventory.id}/movements`).set(adminHeaders);
    expect(movements.body.data[0]).toMatchObject({
      type: "min_stock_change",
      quantity: 0,
      reason: "manual_correction",
      createdBy: admin.id,
    });
  });

  it("PATCH /:id/min-stock responde 400 con minStock inválido", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);

    const res = await request(app)
      .patch(`/api/inventory/${inventory.id}/min-stock`)
      .set(adminHeaders)
      .send({ minStock: -1, reason: "manual_correction" });

    expect(res.status).toBe(400);
  });

  it("PATCH /:id/min-stock responde 403 para customer y 404 si no existe", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id);
    const body = { minStock: 8, reason: "manual_correction" };

    const forbidden = await request(app).patch(`/api/inventory/${inventory.id}/min-stock`).set(customerHeaders).send(body);
    expect(forbidden.status).toBe(403);

    const missing = await request(app)
      .patch("/api/inventory/64b00000000000000000000a/min-stock")
      .set(adminHeaders)
      .send(body);
    expect(missing.status).toBe(404);
  });

  it("GET /:id/movements pagina el historial", async () => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 10 });

    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post(`/api/inventory/${inventory.id}/adjust`)
        .set(adminHeaders)
        .send({ operation: "increase", quantity: 1, reason: "manual_correction" });
    }

    const res = await request(app).get(`/api/inventory/${inventory.id}/movements?page=1&limit=2`).set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.pages).toBe(2);
  });
});
