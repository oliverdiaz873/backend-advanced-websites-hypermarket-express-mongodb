import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/inventory-movements", () => {
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

  const createMovement = async (operation: "increase" | "decrease" | "set", quantity: number, reason: string): Promise<{ inventoryId: string; productId: string }> => {
    const product = await createTestProduct();
    const inventory = await createTestInventory(product.id, { stock: 10 });

    await request(app)
      .post(`/api/inventory/${inventory.id}/adjust`)
      .set(adminHeaders)
      .send({ operation, quantity, reason });

    return { inventoryId: inventory.id, productId: product.id };
  };

  it("GET / responde 200 con el historial global paginado (admin)", async () => {
    await createMovement("increase", 5, "supplier_adjustment");
    await createMovement("decrease", 2, "manual_correction");

    const res = await request(app).get("/api/inventory-movements").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      type: expect.any(String),
      previousStock: expect.any(Number),
      newStock: expect.any(Number),
      reason: expect.any(String),
      createdBy: admin.id,
    });
  });

  it("GET / filtra por productId y type", async () => {
    const { productId } = await createMovement("increase", 5, "supplier_adjustment");
    await createMovement("decrease", 2, "manual_correction");

    const byProduct = await request(app).get(`/api/inventory-movements?productId=${productId}`).set(adminHeaders);
    expect(byProduct.status).toBe(200);
    expect(byProduct.body.data).toHaveLength(1);
    expect(byProduct.body.data[0].productId).toBe(productId);

    const byType = await request(app).get("/api/inventory-movements?type=decrease").set(adminHeaders);
    expect(byType.status).toBe(200);
    expect(byType.body.data).toHaveLength(1);
    expect(byType.body.data[0].type).toBe("decrease");
  });

  it("GET / descarta type inválido y pagina", async () => {
    await createMovement("increase", 5, "supplier_adjustment");

    const res = await request(app).get("/api/inventory-movements?type=hacked&page=1&limit=1").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.page).toBe(1);
  });

  it("GET / responde 401 sin token y 403 para customer", async () => {
    const unauthenticated = await request(app).get("/api/inventory-movements");
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app).get("/api/inventory-movements").set(customerHeaders);
    expect(forbidden.status).toBe(403);
  });
});
