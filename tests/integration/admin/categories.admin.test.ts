import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestCategory } from "../helpers/category.helper";
import { createTestProduct } from "../helpers/product.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/categories (CRUD admin)", () => {
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

  describe("POST /api/categories", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/categories").send({ name: "Bebidas" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).post("/api/categories").set(customerHeaders).send({ name: "Bebidas" });
      expect(res.status).toBe(403);
    });

    it("responde 201 y genera el slug desde el nombre", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set(adminHeaders)
        .send({ name: "Bebidas", subcategories: [{ name: "Gaseosas", slug: "gaseosas" }] });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: "Bebidas",
        slug: "bebidas",
        subcategories: [{ name: "Gaseosas", slug: "gaseosas" }],
      });
      expect(res.body.data.id).toBeTruthy();
    });

    it("responde 409 si el slug ya existe", async () => {
      await createTestCategory({ name: "Bebidas", slug: "bebidas" });

      const res = await request(app).post("/api/categories").set(adminHeaders).send({ name: "Bebidas 2", slug: "bebidas" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Category slug already exists: bebidas");
    });

    it("responde 409 si el nombre ya existe", async () => {
      await createTestCategory({ name: "Bebidas", slug: "bebidas" });

      const res = await request(app).post("/api/categories").set(adminHeaders).send({ name: "Bebidas" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Category name already exists: Bebidas");
    });
  });

  describe("PATCH /api/categories/:id", () => {
    it("responde 401 sin token", async () => {
      const category = await createTestCategory();
      const res = await request(app).patch(`/api/categories/${category.id}`).send({ name: "X" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const category = await createTestCategory();
      const res = await request(app).patch(`/api/categories/${category.id}`).set(customerHeaders).send({ name: "X" });
      expect(res.status).toBe(403);
    });

    it("propaga el cambio de nombre/slug a los productos embebidos", async () => {
      const category = await createTestCategory();
      const product = await createTestProduct({
        categoryId: category.id,
        category: { name: category.name, slug: category.slug },
      });

      const res = await request(app)
        .patch(`/api/categories/${category.id}`)
        .set(adminHeaders)
        .send({ name: "Bebidas Premium", slug: "bebidas-premium" });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: "Bebidas Premium", slug: "bebidas-premium" });

      const productRes = await request(app).get(`/api/products/${product.id}`);
      expect(productRes.body.data.category).toEqual({ name: "Bebidas Premium", slug: "bebidas-premium" });
    });

    it("responde 409 si el slug duplicado pertenece a otra categoría", async () => {
      const category = await createTestCategory();
      const other = await createTestCategory();

      const res = await request(app)
        .patch(`/api/categories/${category.id}`)
        .set(adminHeaders)
        .send({ slug: other.slug });
      expect(res.status).toBe(409);
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).patch("/api/categories/cat_inexistente").set(adminHeaders).send({ name: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("responde 401 sin token", async () => {
      const category = await createTestCategory();
      const res = await request(app).delete(`/api/categories/${category.id}`);
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const category = await createTestCategory();
      const res = await request(app).delete(`/api/categories/${category.id}`).set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 204 si no tiene productos referenciados", async () => {
      const category = await createTestCategory();
      const res = await request(app).delete(`/api/categories/${category.id}`).set(adminHeaders);
      expect(res.status).toBe(204);
    });

    it("responde 409 si tiene productos referenciados", async () => {
      const category = await createTestCategory();
      await createTestProduct({
        categoryId: category.id,
        category: { name: category.name, slug: category.slug },
      });

      const res = await request(app).delete(`/api/categories/${category.id}`).set(adminHeaders);
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Cannot delete category with referenced products");
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).delete("/api/categories/cat_inexistente").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });
});
