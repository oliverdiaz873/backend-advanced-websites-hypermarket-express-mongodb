import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestProduct } from "../helpers/product.helper";
import { createTestOffer } from "../helpers/offer.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/offers (CRUD admin)", () => {
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

  it("GET / solo devuelve ofertas vigentes (isActive y dentro de fechas)", async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    const future = new Date(now.getTime() + 1000 * 60 * 60 * 24);

    const pActive = await createTestProduct();
    const pExpired = await createTestProduct();
    const pFuture = await createTestProduct();
    const pInactive = await createTestProduct();

    await createTestOffer(pActive.id, { startDate: past, endDate: future });
    await createTestOffer(pExpired.id, { startDate: past, endDate: past });
    await createTestOffer(pFuture.id, { startDate: future, endDate: undefined });
    await createTestOffer(pInactive.id, { isActive: false, startDate: past, endDate: future });

    const res = await request(app).get("/api/offers");

    expect(res.status).toBe(200);
    const ids = res.body.data.map((o: { id: string }) => o.id);
    expect(ids).toContain(pActive.id);
    expect(ids).not.toContain(pExpired.id);
    expect(ids).not.toContain(pFuture.id);
    expect(ids).not.toContain(pInactive.id);
  });

  describe("POST /api/offers", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/offers").send({});
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).post("/api/offers").set(customerHeaders).send({});
      expect(res.status).toBe(403);
    });

    it("responde 201 y crea la oferta", async () => {
      const product = await createTestProduct({ price: 100 });

      const res = await request(app).post("/api/offers").set(adminHeaders).send({
        productId: product.id,
        originalPrice: 100,
        discountPrice: 80,
        startDate: new Date("2026-01-01"),
      });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        productId: product.id,
        originalPrice: 100,
        discountPrice: 80,
        isActive: true,
      });
    });

    it("responde 400 si discountPrice no es menor a originalPrice", async () => {
      const product = await createTestProduct({ price: 100 });

      const res = await request(app).post("/api/offers").set(adminHeaders).send({
        productId: product.id,
        originalPrice: 100,
        discountPrice: 100,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("discountPrice must be less than originalPrice");
    });

    it("responde 400 si startDate es posterior a endDate", async () => {
      const product = await createTestProduct({ price: 100 });

      const res = await request(app).post("/api/offers").set(adminHeaders).send({
        productId: product.id,
        originalPrice: 100,
        discountPrice: 80,
        startDate: new Date("2026-12-31"),
        endDate: new Date("2026-01-01"),
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("startDate must be before or equal to endDate");
    });

    it("responde 404 si el producto no existe", async () => {
      const res = await request(app).post("/api/offers").set(adminHeaders).send({
        productId: "prod_inexistente",
        originalPrice: 100,
        discountPrice: 80,
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Product not found");
    });
  });

  describe("PATCH /api/offers/:id", () => {
    it("responde 401 sin token", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);
      const res = await request(app).patch(`/api/offers/${offer.id}`).send({ isActive: false });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);
      const res = await request(app).patch(`/api/offers/${offer.id}`).set(customerHeaders).send({ isActive: false });
      expect(res.status).toBe(403);
    });

    it("responde 200 y actualiza la oferta", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);

      const res = await request(app).patch(`/api/offers/${offer.id}`).set(adminHeaders).send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it("responde 400 si las fechas quedan invertidas", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id, { endDate: new Date("2026-01-01") });

      const res = await request(app)
        .patch(`/api/offers/${offer.id}`)
        .set(adminHeaders)
        .send({ startDate: new Date("2026-06-01") });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("startDate must be before or equal to endDate");
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).patch("/api/offers/64b0000000000000000000fa").set(adminHeaders).send({ isActive: false });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Offer not found");
    });
  });

  describe("DELETE /api/offers/:id", () => {
    it("responde 401 sin token", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);
      const res = await request(app).delete(`/api/offers/${offer.id}`);
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);
      const res = await request(app).delete(`/api/offers/${offer.id}`).set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 204 y borra la oferta", async () => {
      const product = await createTestProduct();
      const offer = await createTestOffer(product.id);

      const res = await request(app).delete(`/api/offers/${offer.id}`).set(adminHeaders);

      expect(res.status).toBe(204);
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app).delete("/api/offers/64b0000000000000000000fa").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/offers", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/offers");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/offers").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 y lista TODAS las ofertas (activas, inactivas y expiradas) con productName", async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000 * 60 * 60 * 24);
      const future = new Date(now.getTime() + 1000 * 60 * 60 * 24);

      const pActive = await createTestProduct({ name: "Arroz Activo" });
      const pExpired = await createTestProduct({ name: "Arroz Expirado" });
      const pFuture = await createTestProduct({ name: "Arroz Futuro" });
      const pInactive = await createTestProduct({ name: "Arroz Inactivo" });

      const oActive = await createTestOffer(pActive.id, { startDate: past, endDate: future });
      const oExpired = await createTestOffer(pExpired.id, { startDate: past, endDate: past });
      const oFuture = await createTestOffer(pFuture.id, { startDate: future, endDate: undefined });
      const oInactive = await createTestOffer(pInactive.id, { isActive: false, startDate: past, endDate: future });

      const res = await request(app).get("/api/admin/offers").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const offers = res.body.data as Array<{ id: string; productName: string; isActive: boolean }>;
      expect(offers.map((o) => o.id).sort()).toEqual([oActive.id, oExpired.id, oFuture.id, oInactive.id].sort());
      const byId = new Map(offers.map((o) => [o.id, o]));
      expect(byId.get(oInactive.id)?.isActive).toBe(false);
      expect(byId.get(oActive.id)?.productName).toBe("Arroz Activo");
      expect(byId.get(oExpired.id)?.productName).toBe("Arroz Expirado");
      expect(byId.get(oFuture.id)?.productName).toBe("Arroz Futuro");
    });

    it("responde 200 con array vacío cuando no hay ofertas", async () => {
      const res = await request(app).get("/api/admin/offers").set(adminHeaders);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });
});
