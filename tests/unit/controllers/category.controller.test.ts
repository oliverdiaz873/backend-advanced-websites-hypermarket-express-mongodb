import request from "supertest";
import categoryRoutes from "../../../src/modules/categories/routes/category.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { makeCategory, CATEGORY_ID } from "../factories/category.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/categories/services/category.service", () =>
  require("../mocks/repositories").mockCategoryService
);

import { mockCategoryService } from "../mocks/repositories";

const app = createTestApp("/api/categories", categoryRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "customer@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("category.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/categories", () => {
    it("responde 200 con la lista de categorías", async () => {
      const categories = [makeCategory()];
      mockCategoryService.getAll.mockResolvedValue(categories);

      const res = await request(app).get("/api/categories");

      expect(mockCategoryService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(categories) });
    });
  });

  describe("GET /api/categories/:id", () => {
    it("responde 200 con la categoría", async () => {
      const category = makeCategory();
      mockCategoryService.getById.mockResolvedValue(category);

      const res = await request(app).get(`/api/categories/${CATEGORY_ID}`);

      expect(mockCategoryService.getById).toHaveBeenCalledWith(CATEGORY_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(category));
    });

    it("responde 404 si no existe", async () => {
      mockCategoryService.getById.mockRejectedValue(new NotFoundError("Category not found"));

      const res = await request(app).get("/api/categories/inexistente");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Category not found", statusCode: 404 });
    });
  });

  describe("POST /api/categories", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/categories").send({ name: "Bebidas" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "Bebidas" });

      expect(res.status).toBe(403);
    });

    it("responde 201 y crea la categoría (admin)", async () => {
      const category = makeCategory();
      mockCategoryService.create.mockResolvedValue(category);

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Bebidas" });

      expect(mockCategoryService.create).toHaveBeenCalledWith({ name: "Bebidas" });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(category) });
    });

    it("responde 409 si el slug ya existe", async () => {
      mockCategoryService.create.mockRejectedValue(new ConflictError("Category slug already exists: bebidas"));

      const res = await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Bebidas" });

      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /api/categories/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/categories/${CATEGORY_ID}`).send({ name: "X" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/categories/${CATEGORY_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "X" });

      expect(res.status).toBe(403);
    });

    it("responde 200 y actualiza la categoría (admin)", async () => {
      const updated = makeCategory({ name: "Bebidas y refrescos" });
      mockCategoryService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/categories/${CATEGORY_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Bebidas y refrescos" });

      expect(mockCategoryService.updateById).toHaveBeenCalledWith(CATEGORY_ID, { name: "Bebidas y refrescos" });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("DELETE /api/categories/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete(`/api/categories/${CATEGORY_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .delete(`/api/categories/${CATEGORY_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 204 y borra la categoría (admin)", async () => {
      mockCategoryService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/categories/${CATEGORY_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockCategoryService.remove).toHaveBeenCalledWith(CATEGORY_ID);
      expect(res.status).toBe(204);
    });

    it("responde 409 si tiene productos referenciados", async () => {
      mockCategoryService.remove.mockRejectedValue(
        new ConflictError("Cannot delete category with referenced products")
      );

      const res = await request(app)
        .delete(`/api/categories/${CATEGORY_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });
  });
});
