import request from "supertest";
import brandRoutes from "../../../src/modules/brands/routes/brand.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { makeBrand, BRAND_ID } from "../factories/brand.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/brands/services/brand.service", () =>
  require("../mocks/repositories").mockBrandService
);

import { mockBrandService } from "../mocks/repositories";

const app = createTestApp("/api/brands", brandRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "customer@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("brand.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/brands", () => {
    it("responde 200 con la lista de marcas", async () => {
      const brands = [makeBrand()];
      mockBrandService.getAll.mockResolvedValue(brands);

      const res = await request(app).get("/api/brands");

      expect(mockBrandService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(brands) });
    });
  });

  describe("GET /api/brands/:id", () => {
    it("responde 200 con la marca", async () => {
      const brand = makeBrand();
      mockBrandService.getById.mockResolvedValue(brand);

      const res = await request(app).get(`/api/brands/${BRAND_ID}`);

      expect(mockBrandService.getById).toHaveBeenCalledWith(BRAND_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(brand));
    });

    it("responde 404 si no existe", async () => {
      mockBrandService.getById.mockRejectedValue(new NotFoundError("Brand not found"));

      const res = await request(app).get("/api/brands/inexistente");

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ success: false, message: "Brand not found", statusCode: 404, code: "NOT_FOUND" });
    });
  });

  describe("POST /api/brands", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).post("/api/brands").send({ name: "Coca-Cola" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post("/api/brands")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "Coca-Cola" });

      expect(res.status).toBe(403);
    });

    it("responde 201 y crea la marca (admin)", async () => {
      const brand = makeBrand();
      mockBrandService.create.mockResolvedValue(brand);

      const res = await request(app)
        .post("/api/brands")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Coca-Cola" });

      expect(mockBrandService.create).toHaveBeenCalledWith({ name: "Coca-Cola" }, "64b000000000000000000002");
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(brand) });
    });

    it("responde 409 si el slug ya existe", async () => {
      mockBrandService.create.mockRejectedValue(new ConflictError("Brand slug already exists: coca-cola"));

      const res = await request(app)
        .post("/api/brands")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Coca-Cola" });

      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /api/brands/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/brands/${BRAND_ID}`).send({ name: "X" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/brands/${BRAND_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "X" });

      expect(res.status).toBe(403);
    });

    it("responde 200 y actualiza la marca (admin)", async () => {
      const updated = makeBrand({ name: "Coca-Cola Company" });
      mockBrandService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/brands/${BRAND_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Coca-Cola Company" });

      expect(mockBrandService.updateById).toHaveBeenCalledWith(BRAND_ID, { name: "Coca-Cola Company" }, "64b000000000000000000002");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("DELETE /api/brands/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete(`/api/brands/${BRAND_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .delete(`/api/brands/${BRAND_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 204 y borra la marca (admin)", async () => {
      mockBrandService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/brands/${BRAND_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockBrandService.remove).toHaveBeenCalledWith(BRAND_ID, "64b000000000000000000002");
      expect(res.status).toBe(204);
    });

    it("responde 409 si tiene productos referenciados", async () => {
      mockBrandService.remove.mockRejectedValue(
        new ConflictError("Cannot delete brand with referenced products")
      );

      const res = await request(app)
        .delete(`/api/brands/${BRAND_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
    });
  });

  describe("POST /api/brands/:id/restore", () => {
    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .post(`/api/brands/${BRAND_ID}/restore`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 y restaura la marca (admin)", async () => {
      mockBrandService.restore.mockResolvedValue(undefined);

      const res = await request(app)
        .post(`/api/brands/${BRAND_ID}/restore`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockBrandService.restore).toHaveBeenCalledWith(BRAND_ID, "64b000000000000000000002");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: null });
    });

    it("responde 404 si la marca no existe", async () => {
      mockBrandService.restore.mockRejectedValue(new NotFoundError("Brand not found"));

      const res = await request(app)
        .post(`/api/brands/${BRAND_ID}/restore`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });
});
