import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestCustomer } from "../helpers/customer.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOrder } from "../helpers/order.helper";
import type { User } from "../../../src/types";

describe("E6.1.4 /api/admin/search (búsqueda global admin)", () => {
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

  describe("RBAC", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/search").query({ q: "arroz" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/search").query({ q: "arroz" }).set(customerHeaders);
      expect(res.status).toBe(403);
    });
  });

  describe("búsqueda de productos", () => {
    it("devuelve productos que coinciden por nombre en formato AdminProduct", async () => {
      const product = await createTestProduct({ name: "Arroz Orgánico Premium" });
      await createTestProduct({ name: "Frijoles Negros" });

      const res = await request(app).get("/api/admin/search").query({ q: "orgánico" }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const products = res.body.data.products;
      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({ id: product.id, name: "Arroz Orgánico Premium", sku: product.sku });
      expect(products[0]).not.toHaveProperty("isDeleted");
      expect(products[0]).not.toHaveProperty("deletedAt");
    });

    it("no incluye productos soft-borrados", async () => {
      const product = await createTestProduct({ name: "Pasta Semola" });

      await request(app).delete(`/api/products/${product.id}`).set(adminHeaders);

      const res = await request(app).get("/api/admin/search").query({ q: "pasta" }).set(adminHeaders);
      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(0);
    });
  });

  describe("búsqueda de órdenes", () => {
    it("devuelve órdenes del cliente que coincide por nombre/email", async () => {
      const buyer = await createTestCustomer({ name: "Carmen Rosa" });
      const order = await createTestOrder(buyer.id, [
        { productId: "p1", name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", quantity: 1 },
      ]);

      const res = await request(app).get("/api/admin/search").query({ q: "carmen" }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.map((o: { id: string }) => o.id)).toEqual([order.id]);
      expect(res.body.data.orders[0]).toMatchObject({ customer: { name: "Carmen Rosa" } });
    });

    it("devuelve la orden cuando q es su id", async () => {
      const buyer = await createTestCustomer({ name: "Luisa Mar" });
      const order = await createTestOrder(buyer.id, [
        { productId: "p1", name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", quantity: 1 },
      ]);

      const res = await request(app).get("/api/admin/search").query({ q: order.id }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.orders.map((o: { id: string }) => o.id)).toEqual([order.id]);
    });
  });

  describe("búsqueda de clientes", () => {
    it("devuelve clientes por nombre/email sin campos privados", async () => {
      const c1 = await createTestCustomer({ name: "María Fernanda", email: "maria.fernanda@example.com" });
      await createTestCustomer({ name: "Pedro Pablo" });

      const res = await request(app).get("/api/admin/search").query({ q: "fernanda" }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.customers.map((c: { id: string }) => c.id)).toEqual([c1.id]);
      expect(res.body.data.customers[0]).toMatchObject({ name: "María Fernanda", email: "maria.fernanda@example.com" });
      expect(res.body.data.customers[0]).not.toHaveProperty("password");
      expect(res.body.data.customers[0]).not.toHaveProperty("role");
    });
  });

  describe("q y límites", () => {
    it("devuelve arrays vacíos cuando q está vacío o ausente", async () => {
      await createTestProduct({ name: "Arroz 1kg" });
      await createTestCustomer({ name: "Ana Bel" });

      const res = await request(app).get("/api/admin/search").set(adminHeaders);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ products: [], orders: [], customers: [] });
    });

    it("devuelve arrays vacíos cuando no hay coincidencias", async () => {
      const res = await request(app).get("/api/admin/search").query({ q: "zzz_no_existe" }).set(adminHeaders);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ products: [], orders: [], customers: [] });
    });

    it("aplica limit por defecto 5 por colección", async () => {
      for (let i = 0; i < 6; i += 1) {
        await createTestProduct({ name: `Lote Arroz ${i}` });
      }

      const res = await request(app).get("/api/admin/search").query({ q: "lote arroz" }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(5);
    });

    it("aplica el máximo de 20 por colección", async () => {
      for (let i = 0; i < 25; i += 1) {
        await createTestProduct({ name: `Masivo Arroz ${i}` });
      }

      const res = await request(app).get("/api/admin/search").query({ q: "masivo", limit: 100 }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(20);
    });
  });
});