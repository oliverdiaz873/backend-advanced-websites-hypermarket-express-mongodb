import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestCategory } from "../helpers/category.helper";
import { createTestBrand } from "../helpers/brand.helper";
import { InventoryModel } from "../../../src/modules/inventory/models/inventory.model";
import type { User } from "../../../src/types";

describe("E2E: /api/products (CRUD admin)", () => {
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

  describe("POST /api/products", () => {
    const payload = () => ({
      name: "Café Molido 500g",
      price: 120,
      image: "https://example.com/cafe.png",
      categoryId: "cat_inexistente",
    });

    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/products").send(payload());
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).post("/api/products").set(customerHeaders).send(payload());
      expect(res.status).toBe(403);
    });

    it("responde 201, crea un producto DRAFT e inventario en cascada", async () => {
      const category = await createTestCategory();
      const brand = await createTestBrand();

      const res = await request(app).post("/api/products").set(adminHeaders).send({
        name: "Café Molido 500g",
        price: 120,
        image: "https://example.com/cafe.png",
        categoryId: category.id,
        brandId: brand.id,
        stock: 25,
        minStock: 5,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        name: "Café Molido 500g",
        price: 120,
        categoryId: category.id,
        category: { name: category.name, slug: category.slug },
        brand: { name: brand.name, slug: brand.slug },
        status: "inactive",
        isAvailable: false,
      });
      expect(res.body.data).not.toHaveProperty("imageKey");
      expect(res.body.data).not.toHaveProperty("translations");
      expect(res.body.data.id).toBeTruthy();

      const inventory = await InventoryModel.findOne({ productId: res.body.data.id });
      expect(inventory).not.toBeNull();
      expect(inventory?.stock).toBe(25);
      expect(inventory?.minStock).toBe(5);
    });

    it("activa un draft mediante PATCH explícito", async () => {
      const category = await createTestCategory();

      const created = await request(app).post("/api/products").set(adminHeaders).send({
        name: "Café Molido 250g",
        price: 60,
        categoryId: category.id,
      });

      expect(created.body.data.status).toBe("inactive");

      const res = await request(app)
        .patch(`/api/products/${created.body.data.id}`)
        .set(adminHeaders)
        .send({ status: "active", isAvailable: true });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ status: "active", isAvailable: true });
    });

    it("responde 409 si el sku ya existe", async () => {
      const category = await createTestCategory();
      const product = await createTestProduct({
        categoryId: category.id,
        category: { name: category.name, slug: category.slug },
      });

      const res = await request(app).post("/api/products").set(adminHeaders).send({
        ...payload(),
        sku: product.sku,
        categoryId: category.id,
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe(`Product sku already exists: ${product.sku}`);
    });

    it("responde 404 si la categoría no existe", async () => {
      const res = await request(app).post("/api/products").set(adminHeaders).send(payload());
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Category not found");
    });
  });

  describe("PATCH /api/products/:id", () => {
    it("responde 401 sin token", async () => {
      const product = await createTestProduct();
      const res = await request(app).patch(`/api/products/${product.id}`).send({ name: "X" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const product = await createTestProduct();
      const res = await request(app).patch(`/api/products/${product.id}`).set(customerHeaders).send({ name: "X" });
      expect(res.status).toBe(403);
    });

    it("actualiza y re-sincroniza los snapshots de categoría/marca", async () => {
      const category = await createTestCategory();
      const newCategory = await createTestCategory({ name: "Granos", slug: "granos" });
      const product = await createTestProduct({ categoryId: category.id, category: { name: category.name, slug: category.slug } });

      const res = await request(app)
        .patch(`/api/products/${product.id}`)
        .set(adminHeaders)
        .send({ categoryId: newCategory.id, price: 99 });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        price: 99,
        categoryId: newCategory.id,
        category: { name: newCategory.name, slug: newCategory.slug },
      });
    });

    it("marca un producto como featured (E4.6) y el toggle es reversible", async () => {
      const product = await createTestProduct({ name: "Destacable" });

      const on = await request(app)
        .patch(`/api/products/${product.id}`)
        .set(adminHeaders)
        .send({ featured: true });

      expect(on.status).toBe(200);
      expect(on.body.data.featured).toBe(true);

      const off = await request(app)
        .patch(`/api/products/${product.id}`)
        .set(adminHeaders)
        .send({ featured: false });

      expect(off.status).toBe(200);
      expect(off.body.data.featured).toBe(false);
    });

    it("responde 404 si el producto no existe", async () => {
      const res = await request(app).patch("/api/products/prod_inexistente").set(adminHeaders).send({ price: 1 });
      expect(res.status).toBe(404);
    });

    it("responde 409 si el sku pertenece a otro producto", async () => {
      const product = await createTestProduct();
      const other = await createTestProduct();

      const res = await request(app).patch(`/api/products/${product.id}`).set(adminHeaders).send({ sku: other.sku });
      expect(res.status).toBe(409);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("responde 401 sin token", async () => {
      const product = await createTestProduct();
      const res = await request(app).delete(`/api/products/${product.id}`);
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const product = await createTestProduct();
      const res = await request(app).delete(`/api/products/${product.id}`).set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 204 y borra producto e inventario", async () => {
      const product = await createTestProduct();
      const inventory = await InventoryModel.create({ productId: product.id, stock: 10 });

      const res = await request(app).delete(`/api/products/${product.id}`).set(adminHeaders);

      expect(res.status).toBe(204);
      const found = await InventoryModel.findById(inventory.id);
      expect(found).toBeNull();
    });

    it("continúa aunque el inventario ya no exista (idempotente)", async () => {
      const product = await createTestProduct();
      await InventoryModel.deleteOne({ productId: product.id });

      const res = await request(app).delete(`/api/products/${product.id}`).set(adminHeaders);

      expect(res.status).toBe(204);
    });

    it("responde 404 si el producto no existe", async () => {
      const res = await request(app).delete("/api/products/prod_inexistente").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });
});
