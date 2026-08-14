import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestBrand } from "../helpers/brand.helper";
import { createTestCategory } from "../helpers/category.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOffer } from "../helpers/offer.helper";
import type { User } from "../../../src/types";

describe("E2E: soft-delete + restore (E6.1.1)", () => {
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

  describe("productos", () => {
    it("oculta el producto al soft-borrar y lo devuelve al restaurar", async () => {
      const product = await createTestProduct();

      const deleted = await request(app)
        .delete(`/api/products/${product.id}`)
        .set(adminHeaders);
      expect(deleted.status).toBe(204);

      const hidden = await request(app).get(`/api/products/${product.id}`);
      expect(hidden.status).toBe(404);

      const list = await request(app).get("/api/products");
      expect(list.body.data.find((p: { id: string }) => p.id === product.id)).toBeUndefined();

      const restored = await request(app)
        .post(`/api/admin/products/${product.id}/restore`)
        .set(adminHeaders);
      expect(restored.status).toBe(200);

      const visible = await request(app).get(`/api/products/${product.id}`);
      expect(visible.status).toBe(200);
      expect(visible.body.data.id).toBe(product.id);
    });

    it("permite reusar el sku mientras el anterior está soft-borrado y falla el restore (409)", async () => {
      const product = await createTestProduct();
      const category = await createTestCategory();

      await request(app).delete(`/api/products/${product.id}`).set(adminHeaders);

      const reused = await request(app)
        .post("/api/products")
        .set(adminHeaders)
        .send({
          sku: product.sku,
          name: "Otro arroz",
          price: 99,
          image: "https://example.com/arroz2.png",
          categoryId: category.id,
        });
      expect(reused.status).toBe(201);

      const restore = await request(app)
        .post(`/api/admin/products/${product.id}/restore`)
        .set(adminHeaders);
      expect(restore.status).toBe(409);
    });

    it("requiere token y rol admin para restaurar", async () => {
      const product = await createTestProduct();

      const noToken = await request(app).post(`/api/admin/products/${product.id}/restore`);
      expect(noToken.status).toBe(401);

      const customer = await request(app)
        .post(`/api/admin/products/${product.id}/restore`)
        .set(customerHeaders);
      expect(customer.status).toBe(403);
    });

    it("responde 404 si el producto no existe", async () => {
      const res = await request(app)
        .post("/api/admin/products/prod_inexistente/restore")
        .set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("ofertas", () => {
    it("oculta la oferta al soft-borrar y la devuelve al restaurar", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);

      const before = await request(app).get("/api/admin/offers").set(adminHeaders);
      expect(before.body.data.find((o: { id: string }) => o.id === offer.id)).toBeTruthy();

      const deleted = await request(app)
        .delete(`/api/offers/${offer.id}`)
        .set(adminHeaders);
      expect(deleted.status).toBe(204);

      const hidden = await request(app).get("/api/admin/offers").set(adminHeaders);
      expect(hidden.body.data.find((o: { id: string }) => o.id === offer.id)).toBeUndefined();

      const restored = await request(app)
        .post(`/api/admin/offers/${offer.id}/restore`)
        .set(adminHeaders);
      expect(restored.status).toBe(200);

      const after = await request(app).get("/api/admin/offers").set(adminHeaders);
      expect(after.body.data.find((o: { id: string }) => o.id === offer.id)).toBeTruthy();
    });

    it("muestra el fallback «Producto eliminado» si el producto está soft-borrado", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);

      await request(app).delete(`/api/products/${product.id}`).set(adminHeaders);

      const list = await request(app).get("/api/admin/offers").set(adminHeaders);
      const item = list.body.data.find((o: { id: string }) => o.id === offer.id);
      expect(item.productName).toBe("Producto eliminado");
    });
  });

  describe("marcas y categorías", () => {
    it("oculta la marca soft-borrada y la restaura", async () => {
      const brand = await createTestBrand();

      await request(app).delete(`/api/brands/${brand.id}`).set(adminHeaders);

      const hidden = await request(app).get(`/api/brands/${brand.id}`);
      expect(hidden.status).toBe(404);

      const restored = await request(app)
        .post(`/api/brands/${brand.id}/restore`)
        .set(adminHeaders);
      expect(restored.status).toBe(200);

      const visible = await request(app).get(`/api/brands/${brand.id}`);
      expect(visible.status).toBe(200);
    });

    it("permite reusar el nombre tras soft-delete y falla el restore (409)", async () => {
      const brand = await createTestBrand();

      await request(app).delete(`/api/brands/${brand.id}`).set(adminHeaders);

      const reused = await request(app)
        .post("/api/brands")
        .set(adminHeaders)
        .send({ name: brand.name, slug: `slug-${brand.slug}-nuevo` });
      expect(reused.status).toBe(201);

      const restore = await request(app)
        .post(`/api/brands/${brand.id}/restore`)
        .set(adminHeaders);
      expect(restore.status).toBe(409);
    });

    it("oculta la categoría soft-borrada y la restaura", async () => {
      const category = await createTestCategory();

      await request(app).delete(`/api/categories/${category.id}`).set(adminHeaders);

      const hidden = await request(app).get(`/api/categories/${category.id}`);
      expect(hidden.status).toBe(404);

      const restored = await request(app)
        .post(`/api/categories/${category.id}/restore`)
        .set(adminHeaders);
      expect(restored.status).toBe(200);

      const visible = await request(app).get(`/api/categories/${category.id}`);
      expect(visible.status).toBe(200);
    });
  });

  describe("stats", () => {
    it("excluye los productos soft-borrados del total", async () => {
      await createTestProduct();
      const deleted = await createTestProduct();

      await request(app).delete(`/api/products/${deleted.id}`).set(adminHeaders);

      const res = await request(app).get("/api/admin/stats").set(adminHeaders);
      expect(res.status).toBe(200);
      expect(res.body.data.summary.totalProducts).toBe(1);
    });
  });
});