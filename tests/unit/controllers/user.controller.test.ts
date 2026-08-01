import request from "supertest";
import userRoutes from "../../../src/modules/users/routes/user.routes";
import { makePublicUser, USER_ID } from "../factories/user.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/users/services/user.service", () =>
  require("../mocks/repositories").mockUserService
);

import { mockUserService } from "../mocks/repositories";

const app = createTestApp("/api/users", userRoutes);
const customerToken = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("user.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/users", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(401);
    });

    it("responde 403 si el usuario no es admin", async () => {
      const res = await request(app).get("/api/users").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("responde 200 con todos los usuarios si es admin", async () => {
      const users = [makePublicUser()];
      mockUserService.getAll.mockResolvedValue(users);

      const res = await request(app).get("/api/users").set("Authorization", `Bearer ${adminToken}`);

      expect(mockUserService.getAll).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(users) });
    });
  });

  describe("GET /api/users/:id", () => {
    it("responde 200 con sus propios datos", async () => {
      mockUserService.getById.mockResolvedValue(makePublicUser());

      const res = await request(app).get(`/api/users/${USER_ID}`).set("Authorization", `Bearer ${customerToken}`);

      expect(mockUserService.getById).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
    });

    it("responde 403 si un customer consulta los datos de otro usuario", async () => {
      const res = await request(app)
        .get("/api/users/64b000000000000000000099")
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(mockUserService.getById).not.toHaveBeenCalled();
    });

    it("responde 200 si un admin consulta cualquier usuario", async () => {
      const targetId = "64b000000000000000000099";
      mockUserService.getById.mockResolvedValue(makePublicUser({ id: targetId }));

      const res = await request(app).get(`/api/users/${targetId}`).set("Authorization", `Bearer ${adminToken}`);

      expect(mockUserService.getById).toHaveBeenCalledWith(targetId);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /api/users", () => {
    it("responde 400 si faltan campos requeridos", async () => {
      const res = await request(app)
        .post("/api/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Nuevo" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Missing required fields");
    });

    it("crea un usuario y responde 201", async () => {
      const created = makePublicUser();
      mockUserService.create.mockResolvedValue(created);
      const body = { name: "Nuevo", email: "nuevo@example.com", password: "secret123" };

      const res = await request(app).post("/api/users").set("Authorization", `Bearer ${adminToken}`).send(body);

      expect(mockUserService.create).toHaveBeenCalledWith(body);
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(toJson(created));
    });
  });

  describe("PATCH /api/users/:id", () => {
    it("actualiza un usuario y responde 200 (admin)", async () => {
      const updated = makePublicUser({ name: "Nuevo" });
      mockUserService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/users/${USER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Nuevo" });

      expect(mockUserService.updateById).toHaveBeenCalledWith(USER_ID, { name: "Nuevo" });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("DELETE /api/users/:id", () => {
    it("elimina un usuario y responde 200 (admin)", async () => {
      mockUserService.deleteById.mockResolvedValue(true);

      const res = await request(app)
        .delete(`/api/users/${USER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockUserService.deleteById).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });
});
