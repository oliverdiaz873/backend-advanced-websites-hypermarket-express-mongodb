import request from "supertest";
import productRoutes from "../../../src/modules/products/routes/product.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/products/services/product.service", () =>
  require("../mocks/repositories").mockProductService
);

import { mockProductService } from "../mocks/repositories";

const app = createTestApp("/api/products", productRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "customer@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("product.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/products", () => {
    it("responde 200 con la lista paginada de productos", async () => {
      const products = [makeProduct()];
      mockProductService.getPage.mockResolvedValue({
        data: products,
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });

      const res = await request(app).get("/api/products?page=1&limit=50");

      expect(mockProductService.getPage).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: toJson(products),
        pagination: { page: 1, limit: 50, total: 1, pages: 1 },
      });
    });
  });

  describe("GET /api/products/:id", () => {
    it("responde 200 con el producto encontrado", async () => {
      const product = makeProduct();
      mockProductService.getById.mockResolvedValue(product);

      const res = await request(app).get(`/api/products/${PRODUCT_ID}`);

      expect(mockProductService.getById).toHaveBeenCalledWith(PRODUCT_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(product));
    });

    it("responde 404 si el producto no existe", async () => {
      mockProductService.getById.mockRejectedValue(new NotFoundError("Product not found"));

      const res = await request(app).get("/api/products/inexistente");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Product not found", statusCode: 404, code: "NOT_FOUND" });
    });
  });

  describe("POST /api/products", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/products").send({ name: "Arroz 1kg" });

      expect(res.status).toBe(401);
      expect(mockProductService.create).not.toHaveBeenCalled();
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "Arroz 1kg" });

      expect(res.status).toBe(403);
      expect(mockProductService.create).not.toHaveBeenCalled();
    });

    it("responde 201 y crea el producto (admin)", async () => {
      const product = makeProduct();
      mockProductService.create.mockResolvedValue(product);

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", categoryId: "cat_granos" });

      expect(mockProductService.create).toHaveBeenCalledWith({
        name: "Arroz 1kg",
        price: 89.5,
        image: "https://example.com/arroz.png",
        categoryId: "cat_granos",
      }, "64b000000000000000000002");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(product) });
    });
  });

  describe("PATCH /api/products/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/products/${PRODUCT_ID}`).send({ name: "X" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/products/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "X" });

      expect(res.status).toBe(403);
    });

    it("responde 200 y actualiza el producto (admin)", async () => {
      const updated = makeProduct({ name: "Arroz Premium" });
      mockProductService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/products/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Arroz Premium" });

      expect(mockProductService.updateById).toHaveBeenCalledWith(PRODUCT_ID, { name: "Arroz Premium" }, "64b000000000000000000002");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete(`/api/products/${PRODUCT_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .delete(`/api/products/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 204 y borra el producto (admin)", async () => {
      mockProductService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/products/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockProductService.remove).toHaveBeenCalledWith(PRODUCT_ID, "64b000000000000000000002");
      expect(res.status).toBe(204);
    });
  });
});
