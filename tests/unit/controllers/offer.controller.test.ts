import request from "supertest";
import offerRoutes from "../../../src/modules/offers/routes/offer.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeOffer, OFFER_ID } from "../factories/offer.factory";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/offers/services/offer.service", () =>
  require("../mocks/repositories").mockOfferService
);

import { mockOfferService } from "../mocks/repositories";

const app = createTestApp("/api/offers", offerRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "customer@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("offer.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/offers", () => {
    it("responde 200 con las ofertas", async () => {
      const offerResponse = {
        id: PRODUCT_ID,
        name: "Arroz 1kg",
        price: 80,
        originalPrice: 100,
        discountPrice: 80,
        discountPercentage: 20,
        image: "https://example.com/arroz.png",
        categoryId: "cat_granos",
        unit: "kg",
        unitQuantity: 1,
      };
      mockOfferService.getAll.mockResolvedValue([offerResponse]);

      const res = await request(app).get("/api/offers");

      expect(mockOfferService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: [offerResponse] });
    });

    it("propaga el query param lang al service", async () => {
      mockOfferService.getAll.mockResolvedValue([]);

      await request(app).get("/api/offers").query({ lang: "en" });

      expect(mockOfferService.getAll).toHaveBeenCalledWith("en");
    });
  });

  describe("POST /api/offers", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/offers").send({ productId: PRODUCT_ID });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post("/api/offers")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productId: PRODUCT_ID });

      expect(res.status).toBe(403);
    });

    it("responde 201 y crea la oferta (admin)", async () => {
      const offer = makeOffer();
      mockOfferService.create.mockResolvedValue(offer);

      const res = await request(app)
        .post("/api/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ productId: PRODUCT_ID, originalPrice: 100, discountPrice: 80 });

      expect(mockOfferService.create).toHaveBeenCalledWith({
        productId: PRODUCT_ID,
        originalPrice: 100,
        discountPrice: 80,
      }, "64b000000000000000000002");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(offer) });
    });

    it("responde 400 si las fechas son inválidas", async () => {
      mockOfferService.create.mockRejectedValue(new InvalidDataError("startDate must be before or equal to endDate"));

      const res = await request(app)
        .post("/api/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ productId: PRODUCT_ID, originalPrice: 100, discountPrice: 80 });

      expect(res.status).toBe(400);
    });

    it("responde 404 si el producto no existe", async () => {
      mockOfferService.create.mockRejectedValue(new NotFoundError("Product not found"));

      const res = await request(app)
        .post("/api/offers")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ productId: "inexistente", originalPrice: 100, discountPrice: 80 });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/offers/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/offers/${OFFER_ID}`).send({ isActive: false });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/offers/${OFFER_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });

    it("responde 200 y actualiza la oferta (admin)", async () => {
      const updated = makeOffer({ isActive: false });
      mockOfferService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/offers/${OFFER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(mockOfferService.updateById).toHaveBeenCalledWith(OFFER_ID, { isActive: false }, "64b000000000000000000002");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });

    it("responde 404 si no existe", async () => {
      mockOfferService.updateById.mockRejectedValue(new NotFoundError("Offer not found"));

      const res = await request(app)
        .patch(`/api/offers/${OFFER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/offers/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete(`/api/offers/${OFFER_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .delete(`/api/offers/${OFFER_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 204 y borra la oferta (admin)", async () => {
      mockOfferService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/offers/${OFFER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockOfferService.remove).toHaveBeenCalledWith(OFFER_ID, "64b000000000000000000002");
      expect(res.status).toBe(204);
    });
  });
});
