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
        grossRevenue: 300,
        averageOrderValue: 150,
        completedOrders: 2,
        totalCustomers: 1,
        totalProducts: 2,
        lowStockCount: 1,
        pendingContactMessages: 1,
      },
      ordersByStatus: { pending: 1, confirmed: 0, processing: 0, shipped: 0, completed: 2, cancelled: 1 },
      revenue: { gross: { today: 300, week: 300, month: 300 } },
    });
  });

  it("excluye las órdenes canceladas del revenue (solo completed)", async () => {
    await createTestOrder(customer.id, [item("p1", "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item("p2", "Leche", 500, 1)], { status: "cancelled" });

    const res = await request(app).get("/api/admin/stats").set(adminHeaders);

    expect(res.body.data.summary.grossRevenue).toBe(100);
    expect(res.body.data.summary.completedOrders).toBe(1);
    expect(res.body.data.summary.averageOrderValue).toBe(100);
    expect(res.body.data.revenue.gross.today).toBe(100);
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

  it("GET /dashboard devuelve KPIs a partir de ingresos completed y crecimiento", async () => {
    const product = await createTestProduct();
    await createTestInventory(product.id, { stock: 10, minStock: 5 });
    await createTestContactMessage();

    await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(product.id, "Leche", 500, 1)], { status: "cancelled" });
    await createTestOrder(customer.id, [item(product.id, "Fideos", 200, 1)], { status: "pending" });

    const res = await request(app).get("/api/admin/stats/dashboard").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      revenue: 100,
      averageOrderValue: 100,
      orders: 3,
      completedOrders: 1,
      pendingOrders: 1,
      customers: 1,
      newCustomers: 1,
      lowStock: 0,
      pendingContactMessages: 1,
      growthPercent: 100,
    });
  });

  it("GET /dashboard con base vacía retorna ceros sin división por cero", async () => {
    const res = await request(app).get("/api/admin/stats/dashboard").set(adminHeaders);

    expect(res.body.data).toMatchObject({
      revenue: 0,
      averageOrderValue: 0,
      orders: 0,
      completedOrders: 0,
      growthPercent: 0,
    });
  });

  it("GET /revenue devuelve la serie diaria de ingresos completed", async () => {
    const product = await createTestProduct();
    const completed = await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 2)], { status: "completed" });
    await createTestOrder(customer.id, [item(product.id, "Leche", 500, 1)], { status: "cancelled" });

    const res = await request(app).get("/api/admin/stats/revenue?days=30").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    const point = res.body.data[0];
    expect(point.total).toBe(200);
    expect(point.date).toBe(completed.createdAt.toISOString().slice(0, 10));
  });

  it("GET /orders-status agrupa por estado y normaliza los 6 estados", async () => {
    const product = await createTestProduct();
    await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(product.id, "Fideos", 200, 1)], { status: "cancelled" });

    const res = await request(app).get("/api/admin/stats/orders-status").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      completed: 1,
      cancelled: 1,
    });
  });

  it("GET /top-products devuelve los más vendidos por cantidad con limit", async () => {
    const productA = await createTestProduct({ price: 100 });
    const productB = await createTestProduct({ price: 50 });
    await createTestInventory(productA.id, { stock: 10, minStock: 1 });
    await createTestInventory(productB.id, { stock: 10, minStock: 1 });

    await createTestOrder(customer.id, [item(productA.id, "Arroz", 100, 3)], { status: "completed" });
    await createTestOrder(customer.id, [item(productB.id, "Fideos", 50, 1)], { status: "completed" });

    const res = await request(app).get("/api/admin/stats/top-products?days=30&limit=1").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ productId: productA.id, quantity: 3, revenue: 300 });
  });

  it("GET /category-sales agrupa ingresos por categoría", async () => {
    const product = await createTestProduct(); // categoría Granos
    await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 2)], { status: "completed" });
    await createTestOrder(customer.id, [item(product.id, "Fideos", 50, 1)], { status: "completed" });

    const res = await request(app).get("/api/admin/stats/category-sales?days=30").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ category: "Granos", slug: "granos", revenue: 250, orders: 2 });
  });

  it("GET /dashboard?productId= filtra los ingresos al producto indicado", async () => {
    const productA = await createTestProduct();
    const productB = await createTestProduct();
    await createTestOrder(customer.id, [item(productA.id, "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(productB.id, "Fideos", 200, 1)], { status: "completed" });

    const res = await request(app).get(`/api/admin/stats/dashboard?productId=${productA.id}`).set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.revenue).toBe(100);
    expect(res.body.data.completedOrders).toBe(1);
  });

  it("GET /dashboard?categoryId= filtra por categoría (productos resueltos)", async () => {
    const productGranos = await createTestProduct();
    const productLacteos = await createTestProduct({
      categoryId: "cat_lacteos",
      category: { name: "Lácteos", slug: "lacteos" },
    });
    await createTestOrder(customer.id, [item(productGranos.id, "Arroz", 100, 1)], { status: "completed" });
    await createTestOrder(customer.id, [item(productLacteos.id, "Leche", 200, 1)], { status: "completed" });

    const res = await request(app)
      .get("/api/admin/stats/dashboard?categoryId=cat_granos")
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.revenue).toBe(100);
    expect(res.body.data.completedOrders).toBe(1);
  });

  it("GET /dashboard?categoryId= con categoría sin productos devuelve ceros", async () => {
    const product = await createTestProduct();
    await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 1)], { status: "completed" });

    const res = await request(app)
      .get("/api/admin/stats/dashboard?categoryId=cat_vacia")
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.revenue).toBe(0);
    expect(res.body.data.completedOrders).toBe(0);
  });

  it("GET /category-sales?categoryId= filtra las ventas por categoría", async () => {
    const productGranos = await createTestProduct();
    const productLacteos = await createTestProduct({
      categoryId: "cat_lacteos",
      category: { name: "Lácteos", slug: "lacteos" },
    });
    await createTestOrder(customer.id, [item(productGranos.id, "Arroz", 100, 2)], { status: "completed" });
    await createTestOrder(customer.id, [item(productLacteos.id, "Leche", 200, 1)], { status: "completed" });

    const res = await request(app)
      .get("/api/admin/stats/category-sales?categoryId=cat_granos")
      .set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ category: "Granos", slug: "granos", revenue: 200, orders: 1 });
  });

  it("from tiene prioridad sobre days y acota el periodo", async () => {
    const product = await createTestProduct();
    await createTestOrder(customer.id, [item(product.id, "Arroz", 100, 1)], { status: "completed" });

    const future = await request(app)
      .get("/api/admin/stats/revenue?days=30&from=2035-01-01&to=2036-01-01")
      .set(adminHeaders);

    expect(future.status).toBe(200);
    expect(future.body.data).toEqual([]);

    const wide = await request(app)
      .get("/api/admin/stats/revenue?days=30&from=2000-01-01&to=2036-01-01")
      .set(adminHeaders);

    expect(wide.body.data.length).toBeGreaterThan(0);
  });

  it.each([
    ["days=abc", "/api/admin/stats/revenue?days=abc"],
    ["days=0", "/api/admin/stats/revenue?days=0"],
    ["days=30.5", "/api/admin/stats/revenue?days=30.5"],
    ["days=3651", "/api/admin/stats/revenue?days=3651"],
    ["limit=0", "/api/admin/stats/top-products?limit=0"],
    ["limit=51", "/api/admin/stats/top-products?limit=51"],
    ["limit=abc", "/api/admin/stats/top-products?limit=abc"],
    ["from=nope", "/api/admin/stats/revenue?from=nope"],
    ["to=nope", "/api/admin/stats/revenue?to=nope"],
    ["from>to", "/api/admin/stats/revenue?from=2026-02-01&to=2026-01-01"],
  ])("rechaza query inválida con 400 (%s)", async (_name, path) => {
    const res = await request(app).get(`${path}&dummy=1`).set(adminHeaders);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /inventory-summary calcula valor de inventario y tipos de stock", async () => {
    const productA = await createTestProduct({ price: 100 });
    const productLow = await createTestProduct({ price: 50 });
    await createTestInventory(productA.id, { stock: 10, minStock: 1 });
    await createTestInventory(productLow.id, { stock: 2, minStock: 5 });

    const res = await request(app).get("/api/admin/stats/inventory-summary").set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      inventoryValue: 1100,
      totalUnits: 12,
      totalProducts: 2,
      lowStockCount: 1,
      outOfStockCount: 0,
    });
  });
});
