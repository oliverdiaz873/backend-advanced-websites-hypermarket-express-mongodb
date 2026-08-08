import request from "supertest";
import uploadRoutes from "../../../src/modules/uploads/routes/upload.routes";
import { createTestApp, createAuthToken } from "../helpers/test-app";

jest.mock("../../../src/modules/uploads/services/upload.service", () => ({
  createPresignedUpload: jest.fn(),
}));

import { createPresignedUpload } from "../../../src/modules/uploads/services/upload.service";

const app = createTestApp("/api/admin/uploads", uploadRoutes);
const customerToken = createAuthToken({
  id: "64b000000000000000000001",
  email: "customer@example.com",
  role: "customer",
});
const adminToken = createAuthToken({
  id: "64b000000000000000000002",
  email: "admin@example.com",
  role: "admin",
});

const createPresignedMock = createPresignedUpload as jest.Mock;

describe("upload.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/admin/uploads/presigned", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app)
        .post("/api/admin/uploads/presigned")
        .send({ fileName: "coca.webp", contentType: "image/webp" });

      expect(res.status).toBe(401);
      expect(createPresignedMock).not.toHaveBeenCalled();
    });

    it("responde 403 si el rol no es admin", async () => {
      const res = await request(app)
        .post("/api/admin/uploads/presigned")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ fileName: "coca.webp", contentType: "image/webp" });

      expect(res.status).toBe(403);
      expect(createPresignedMock).not.toHaveBeenCalled();
    });

    it("responde 400 si faltan campos requeridos", async () => {
      const res = await request(app)
        .post("/api/admin/uploads/presigned")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ fileName: "coca.webp" });

      expect(res.status).toBe(400);
      expect(createPresignedMock).not.toHaveBeenCalled();
    });

    it("responde 200 con la presigned URL (purpose product)", async () => {
      createPresignedMock.mockResolvedValue({
        uploadUrl: "https://signed.example.com/upload",
        publicUrl: "https://cdn.example.com/products/8f3a/original.webp",
        expiresInSeconds: 600,
        key: "products/8f3a/original.webp",
        productId: "8f3a",
        purpose: "product",
      });

      const res = await request(app)
        .post("/api/admin/uploads/presigned")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ fileName: "coca.webp", contentType: "image/webp", purpose: "product" });

      expect(res.status).toBe(200);
      expect(createPresignedMock).toHaveBeenCalledWith({
        fileName: "coca.webp",
        contentType: "image/webp",
        purpose: "product",
      });
      expect(res.body).toEqual({
        success: true,
        data: {
          uploadUrl: "https://signed.example.com/upload",
          publicUrl: "https://cdn.example.com/products/8f3a/original.webp",
          expiresInSeconds: 600,
          key: "products/8f3a/original.webp",
          productId: "8f3a",
          purpose: "product",
        },
      });
    });

    it("propaga errores de validación del service como 400", async () => {
      createPresignedMock.mockRejectedValue(
        Object.assign(new Error("Unsupported content type: text/html"), {
          name: "InvalidDataError",
          statusCode: 400,
        })
      );

      const res = await request(app)
        .post("/api/admin/uploads/presigned")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ fileName: "a.html", contentType: "text/html" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });
});
