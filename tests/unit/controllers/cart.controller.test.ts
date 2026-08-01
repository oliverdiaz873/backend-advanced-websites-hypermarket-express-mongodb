import request from "supertest";
import cartRoutes from "../../../src/modules/cart/routes/cart.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeCartResponse } from "../factories/cart.factory";
import { PRODUCT_ID } from "../factories/product.factory";
import { USER_ID } from "../factories/user.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/cart/services/cart.service", () =>
  require("../mocks/repositories").mockCartService
);

import { mockCartService } from "../mocks/repositories";

const app = createTestApp("/api/cart", cartRoutes);
const authToken = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

describe("cart.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/cart");

    expect(res.status).toBe(401);
  });

  describe("GET /api/cart", () => {
    it("responde 200 con el carrito", async () => {
      const cart = makeCartResponse();
      mockCartService.getCart.mockResolvedValue(cart);

      const res = await request(app).get("/api/cart").set("Authorization", `Bearer ${authToken}`);

      expect(mockCartService.getCart).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(cart) });
    });
  });

  describe("POST /api/cart/items", () => {
    it("responde 400 si falta productId", async () => {
      const res = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 2 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: productId");
    });

    it("responde 200 y usa quantity por defecto 1", async () => {
      mockCartService.addItem.mockResolvedValue(makeCartResponse());

      const res = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: PRODUCT_ID });

      expect(mockCartService.addItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 1);
      expect(res.status).toBe(200);
    });

    it("responde 200 con la quantity indicada", async () => {
      mockCartService.addItem.mockResolvedValue(makeCartResponse());

      const res = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: PRODUCT_ID, quantity: 3 });

      expect(mockCartService.addItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 3);
      expect(res.status).toBe(200);
    });

    it("no normaliza quantity 0 (lo pasa tal cual al service)", async () => {
      mockCartService.addItem.mockResolvedValue(makeCartResponse());

      const res = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: PRODUCT_ID, quantity: 0 });

      expect(mockCartService.addItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 0);
      expect(res.status).toBe(200);
    });

    it("propaga los errores del service", async () => {
      mockCartService.addItem.mockRejectedValue(new NotFoundError("Product not found"));

      const res = await request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ productId: PRODUCT_ID });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Product not found", statusCode: 404 });
    });
  });

  describe("PATCH /api/cart/items/:productId", () => {
    it("actualiza la cantidad y responde 200", async () => {
      mockCartService.updateItem.mockResolvedValue(makeCartResponse());

      const res = await request(app)
        .patch(`/api/cart/items/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ quantity: 5 });

      expect(mockCartService.updateItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID, 5);
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/cart/items/:productId", () => {
    it("elimina el item y responde 200", async () => {
      mockCartService.removeItem.mockResolvedValue(makeCartResponse());

      const res = await request(app)
        .delete(`/api/cart/items/${PRODUCT_ID}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(mockCartService.removeItem).toHaveBeenCalledWith(USER_ID, PRODUCT_ID);
      expect(res.status).toBe(200);
    });
  });

  describe("DELETE /api/cart", () => {
    it("limpia el carrito y responde 200", async () => {
      mockCartService.clearCart.mockResolvedValue(makeCartResponse());

      const res = await request(app).delete("/api/cart").set("Authorization", `Bearer ${authToken}`);

      expect(mockCartService.clearCart).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
    });
  });
});
