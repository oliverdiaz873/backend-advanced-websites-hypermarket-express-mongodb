import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestBrand } from "../helpers/brand.helper";
import { createTestProduct } from "../helpers/product.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/brands (CRUD admin)", () => {
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

  describe("POST /api/brands", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/brands").send({ name: "Coca-Cola" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).post("/api/brands").set(customerHeaders).send({ name: "Coca-Cola" });
      expect(res.status).toBe(403);
    });

    it("responde 201 y genera el slug desde el nombre", async () => {
      const res = await request(app)
        .post("/api/brands")
        .set(adminHeaders)
        .send({ name: "Coca-Cola", description: "Bebidas gaseosas" });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: "Coca-Cola",
        slug: "coca-cola",
        status: "active",
      });
      expect(res.body.data.id).toBeTruthy();
    });

    it("responde 409 si el slug ya existe", async () => {
      await createTestBrand({ name: "Coca-Cola", slug: "coca-cola" });

      const res = await request(app).post("/api/brands").set(adminHeaders).send({ name: "Otra", slug: "coca-cola" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Brand slug already exists: coca-cola");
    });

    it("responde 409 si el nombre ya existe", async () => {
      await createTestBrand({ name: "Coca-Cola", slug: "coca-cola" });

      const res = await request(app).post("/api/brands").set(adminHeaders).send({ name: "Coca-Cola" });
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Brand name already exists: Coca-Cola");
    });
  });

  describe("PATCH /api/brands/:id", () => {
    it("responde 401 sin token", async () => {
      const brand = await createTestBrand();
      const res = await request(app).patch(`/api/brands/${brand.id}`).send({ name: "X" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const brand = await createTestBrand();
      const res = await request(app).patch(`/api/brands/${brand.id}`).set(customerHeaders).send({ name: "X" });
      expect(res.status).toBe(403);
    });

    it("propaga el cambio de nombre/slug a los productos embebidos", async () => {
      const brand = await createTestBrand();
      const product = await createTestProduct({
        brandId: brand.id,
        brand: { name: brand.name, slug: brand.slug },
      });

      const res = await request(app)
        .patch(`/api/brands/${brand.id}`)
        .set(adminHeaders)
        .send({ name: "Coca-Cola Company", slug: "coca-cola-company" });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ name: "Coca-Cola Company", slug: "coca-cola-company" });

      const productRes = await request(app).get(`/api/products/${product.id}`);
      expect(productRes.body.data.brand).toEqual({ name: "Coca-Cola Company", slug: "coca-cola-company" });
    });

    it("responde 409 si el nombre duplicado pertenece a otra marca", async () => {
      const brand = await createTestBrand();
      const other = await createTestBrand();

      const res = await request(app).patch(`/api/brands/${brand.id}`).set(adminHeaders).send({ name: other.name });
      expect(res.status).toBe(409);
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).patch("/api/brands/br_inexistente").set(adminHeaders).send({ name: "X" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/brands/:id", () => {
    it("responde 401 sin token", async () => {
      const brand = await createTestBrand();
      const res = await request(app).delete(`/api/brands/${brand.id}`);
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const brand = await createTestBrand();
      const res = await request(app).delete(`/api/brands/${brand.id}`).set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 204 si no tiene productos referenciados", async () => {
      const brand = await createTestBrand();
      const res = await request(app).delete(`/api/brands/${brand.id}`).set(adminHeaders);
      expect(res.status).toBe(204);
    });

    it("responde 409 si tiene productos referenciados", async () => {
      const brand = await createTestBrand();
      await createTestProduct({
        brandId: brand.id,
        brand: { name: brand.name, slug: brand.slug },
      });

      const res = await request(app).delete(`/api/brands/${brand.id}`).set(adminHeaders);
      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Cannot delete brand with referenced products");
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).delete("/api/brands/br_inexistente").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });
});
