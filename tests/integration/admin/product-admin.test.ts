import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestCategory } from "../helpers/category.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/admin/products (F4)", () => {
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

  describe("seguridad del router", () => {
    it("responde 401 sin token en GET list, GET byId y PATCH", async () => {
      const list = await request(app).get("/api/admin/products");
      const byId = await request(app).get("/api/admin/products/prod_x");
      const patch = await request(app).patch("/api/admin/products/prod_x").send({});
      expect(list.status).toBe(401);
      expect(byId.status).toBe(401);
      expect(patch.status).toBe(401);
    });

    it("responde 403 para customer en GET list y PATCH", async () => {
      const list = await request(app).get("/api/admin/products").set(customerHeaders);
      const patch = await request(app).patch("/api/admin/products/prod_x").set(customerHeaders).send({});
      expect(list.status).toBe(403);
      expect(patch.status).toBe(403);
    });
  });

  describe("GET /api/admin/products", () => {
    it("lista drafts e inactivos además de activos, sin exponer translations a públicos pero sí en admin", async () => {
      const category = await createTestCategory();
      await createTestProduct({
        id: "admin_draft",
        name: "Premium A",
        status: "active",
        isAvailable: true,
        translations: { en: { name: "Premium En", description: "EN desc" } },
      });
      await createTestProduct({
        id: "admin_inactive",
        name: "Inactive B",
        status: "inactive",
        isAvailable: false,
        translations: { en: { name: "Inactive En" } },
      });

      const res = await request(app).get("/api/admin/products").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.map((p: { id: string }) => p.id)).toEqual(
        expect.arrayContaining(["admin_draft", "admin_inactive"])
      );
      const draft = res.body.data.find((p: { id: string }) => p.id === "admin_draft");
      expect(draft).toMatchObject({ status: "active", translations: { en: { name: "Premium En" } } });
      expect(draft).not.toHaveProperty("__v");
    });

    it("filtra pro status=inactive", async () => {
      await createTestProduct({ id: "admin_ia", name: "IA", status: "inactive", isAvailable: false });
      await createTestProduct({ id: "admin_ac", name: "AC", status: "active", isAvailable: true });

      const res = await request(app).get("/api/admin/products").set(adminHeaders).query({ status: "inactive" });

      expect(res.body.data.map((p: { id: string }) => p.id)).toEqual(["admin_ia"]);
    });
  });

  describe("GET /api/admin/products/:id", () => {
    it("devuelve el shape administrativo con translations e imageKey", async () => {
      await createTestProduct({
        id: "admin_byid",
        name: "Arroz 1kg",
        status: "inactive",
        isAvailable: false,
        imageKey: "products/admin_byid/x.webp",
        image: "products/admin_byid/x.webp",
        translations: { en: { name: "Rice", description: "White rice" } },
      });

      const res = await request(app).get("/api/admin/products/admin_byid").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: "admin_byid",
        name: "Arroz 1kg",
        status: "inactive",
        isAvailable: false,
        imageKey: "products/admin_byid/x.webp",
        translations: { en: { name: "Rice", description: "White rice" } },
      });
      expect(res.body.data).not.toHaveProperty("__v");
    });

    it("404 para producto inexistente", async () => {
      const res = await request(app).get("/api/admin/products/noexiste").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/products/:id", () => {
    it("edita root ES (name/description) y translations.en con merge no destructivo", async () => {
      await createTestProduct({
        id: "admin_edit",
        name: "Café Molido",
        description: "ES root",
        translations: { en: { name: "Ground Coffee", description: "EN old" } },
        status: "inactive",
      });

      const res = await request(app).patch("/api/admin/products/admin_edit").set(adminHeaders).send({
        name: "Café Molido Premium",
        description: "ES root nuevo",
        translations: { en: { description: "EN new" } },
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: "Café Molido Premium",
        description: "ES root nuevo",
        translations: { en: { name: "Ground Coffee", description: "EN new" } },
      });
    });

    it("rechaza translations.es (idioma no administrable)", async () => {
      await createTestProduct({ id: "admin_es_x", name: "Prod", status: "inactive" });

      const res = await request(app).patch("/api/admin/products/admin_es_x").set(adminHeaders).send({
        translations: { es: { name: "No permitido" } },
      });

      expect(res.status).toBe(400);
    });

    it("rechaza un idioma desconocido", async () => {
      await createTestProduct({ id: "admin_fr_x", name: "Prod", status: "inactive" });

      const res = await request(app).patch("/api/admin/products/admin_fr_x").set(adminHeaders).send({
        translations: { fr: { name: "Non" } },
      });

      expect(res.status).toBe(400);
    });

    it("rechaza en.name vacío", async () => {
      await createTestProduct({ id: "admin_empty", name: "Prod", status: "inactive" });

      const res = await request(app).patch("/api/admin/products/admin_empty").set(adminHeaders).send({
        translations: { en: { name: "   " } },
      });

      expect(res.status).toBe(400);
    });
  });
});