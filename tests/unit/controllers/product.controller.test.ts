import request from "supertest";
import productRoutes from "../../../src/modules/products/routes/product.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";
import { createTestApp, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/products/services/product.service", () =>
  require("../mocks/repositories").mockProductService
);

import { mockProductService } from "../mocks/repositories";

const app = createTestApp("/api/products", productRoutes);

describe("product.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/products", () => {
    it("responde 200 con la lista de productos", async () => {
      const products = [makeProduct()];
      mockProductService.getAll.mockResolvedValue(products);

      const res = await request(app).get("/api/products");

      expect(mockProductService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(products) });
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
      expect(res.body).toEqual({ success: false, message: "Product not found", statusCode: 404 });
    });
  });
});
