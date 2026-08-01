import request from "supertest";
import authRoutes from "../../../src/modules/auth/routes/auth.routes";
import { EmailAlreadyExistsError } from "../../../src/shared/errors/email-already-exists.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { UnauthorizedError } from "../../../src/shared/errors/unauthorized.error";
import { makePublicUser, USER_ID } from "../factories/user.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/auth/services/auth.service", () =>
  require("../mocks/repositories").mockAuthService
);
jest.mock("../../../src/shared/middleware/rate-limit.middleware", () => ({
  rateLimit: () => (req: unknown, res: unknown, next: () => void) => next(),
}));

import { mockAuthService } from "../mocks/repositories";

const app = createTestApp("/api/auth", authRoutes);

describe("auth.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("registra un usuario y responde 201", async () => {
      const publicUser = makePublicUser();
      mockAuthService.register.mockResolvedValue(publicUser);

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Oliver Diaz", email: "oliver@example.com", password: "secret123" });

      expect(mockAuthService.register).toHaveBeenCalledWith({
        name: "Oliver Diaz",
        email: "oliver@example.com",
        password: "secret123",
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(publicUser) });
    });

    it("responde 409 si el email ya está registrado", async () => {
      mockAuthService.register.mockRejectedValue(new EmailAlreadyExistsError());

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Oliver Diaz", email: "oliver@example.com", password: "secret123" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({ success: false, message: "Email already exists", statusCode: 409 });
    });

    it("responde 400 si los datos son inválidos", async () => {
      mockAuthService.register.mockRejectedValue(new InvalidDataError("Password must be at least 6 characters"));

      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Oliver Diaz", email: "oliver@example.com", password: "12345" });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: "Password must be at least 6 characters",
        statusCode: 400,
      });
    });

    it("responde 400 sin body", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: "Missing required fields: email, password",
        statusCode: 400,
      });
    });

    it("responde 400 si falta el email", async () => {
      const res = await request(app).post("/api/auth/register").send({ password: "123456" });

      expect(mockAuthService.register).not.toHaveBeenCalled();
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: email");
    });
  });

  describe("POST /api/auth/login", () => {
    it("responde 200 con token y usuario", async () => {
      const user = makePublicUser();
      mockAuthService.login.mockResolvedValue({ token: "token-abc", user });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "oliver@example.com", password: "secret123" });

      expect(mockAuthService.login).toHaveBeenCalledWith("oliver@example.com", "secret123");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: { token: "token-abc", user: toJson(user) } });
    });

    it("responde 401 si el usuario no existe", async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedError("Invalid credentials"));

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@example.com", password: "secret123" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ success: false, message: "Invalid credentials", statusCode: 401 });
    });

    it("responde 401 si la contraseña es incorrecta", async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedError("Invalid credentials"));

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "oliver@example.com", password: "wrong-pass" });

      expect(res.status).toBe(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("responde 200 con el usuario autenticado", async () => {
      const publicUser = makePublicUser();
      mockAuthService.getMe.mockResolvedValue(publicUser);
      const token = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(mockAuthService.getMe).toHaveBeenCalledWith(USER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(publicUser));
    });

    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
    });
  });
});
