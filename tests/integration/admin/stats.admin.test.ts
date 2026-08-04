import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestInventory } from "../helpers/inventory.helper";
import { createTestContactMessage } from "../helpers/contact.helper";
import { createTestOrder } from "../helpers/order.helper";
import type { OrderItem, User } from "../../../src/types";

describe("E2E: /api/admin/stats", () => {
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

  const item = (productId: string, name: string, price: number, quantity: number): OrderItem => ({
    productId,
    name,
    price,
    image: `https://example.com/${name}.png`,
    quantity,
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/admin/stats");
    expect(res.status).toBe(401);
  });

  it("responde 403 para customer", async () => {
    const res = await request(app).get("/api/admin/stats").set(customerHeaders);
    expect(res.status).toBe(403);
  });

  it("responde 200 con todas las métricas agregadas", async () => {
    const productOk = await createTestProduct();
    const productLow = await createTestProduct();
    await createTestInventory(productOk.id, { stock: 10, minStock: 5 });
    await createTestInventory(productLow.id, { stock: 2, minStock: 5 });
    await createTestContactMessage();

    await createTestOrder(customer.id, [item(productOk.id, "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(productLow.id, "Fideos", 200, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(productOk.id, "Arroz", 50, 2)]);
    await createTestOrder(customer.id, [item(productLow.id, "Leche", 500, 1)], { status: "cancelled" });

    const res = await request(app).get("/api/admin/stats").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      summary: {
        totalOrders: 4,
        grossRevenue: 900,
        averageOrderValue: 450,
        completedOrders: 2,
        totalCustomers: 1,
        totalProducts: 2,
        lowStockCount: 1,
        pendingContactMessages: 1,
      },
      ordersByStatus: { pending: 1, confirmed: 0, processing: 0, shipped: 0, completed: 2, cancelled: 1 },
      revenue: { gross: { today: 900, week: 900, month: 900 } },
    });
  });

  it("incluye las órdenes canceladas en grossRevenue", async () => {
    await createTestOrder(customer.id, [item("p1", "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item("p2", "Leche", 500, 1)], { status: "cancelled" });

    const res = await request(app).get("/api/admin/stats").set(adminHeaders);

    expect(res.body.data.summary.grossRevenue).toBe(600);
    expect(res.body.data.summary.completedOrders).toBe(1);
    expect(res.body.data.summary.averageOrderValue).toBe(600);
  });

  it("retorna ceros en las métricas de negocio sin órdenes, productos, inventario ni contactos", async () => {
    const res = await request(app).get("/api/admin/stats").set(adminHeaders);

    expect(res.body.data).toEqual({
      summary: {
        totalOrders: 0,
        grossRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        totalCustomers: 1,
        totalProducts: 0,
        lowStockCount: 0,
        pendingContactMessages: 0,
      },
      ordersByStatus: { pending: 0, confirmed: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 },
      revenue: { gross: { today: 0, week: 0, month: 0 } },
    });
  });

  it("cuenta customers aunque no tengan órdenes y no marca low-stock si stock > minStock", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 10, minStock: 5 });
    await createTestUser();

    const res = await request(app).get("/api/admin/stats").set(adminHeaders);

    expect(res.body.data.summary.totalCustomers).toBe(2);
    expect(res.body.data.summary.lowStockCount).toBe(0);
    expect(res.body.data.summary.totalOrders).toBe(0);
  });
});
