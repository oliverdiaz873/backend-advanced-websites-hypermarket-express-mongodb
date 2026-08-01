import request from "supertest";
import app from "../../../src/app";
import { createTestUser } from "../helpers/user.helper";

const uniqueEmail = (): string =>
  `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

describe("E2E: /api/auth", () => {
  describe("POST /api/auth/register", () => {
    it("registra un usuario y responde 201 sin password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Oliver Diaz",
        email: uniqueEmail(),
        password: "secret123",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBeTruthy();
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data.password).toBeUndefined();
    });

    it("responde 400 si faltan campos", async () => {
      const res = await request(app).post("/api/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: email, password");
    });

    it("responde 409 si el email ya está registrado", async () => {
      const email = uniqueEmail();
      await request(app).post("/api/auth/register").send({ name: "A", email, password: "secret123" });

      const res = await request(app).post("/api/auth/register").send({ name: "B", email, password: "secret123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already exists");
    });

    it("responde 400 si el password es demasiado corto", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "A", email: uniqueEmail(), password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password must be at least 6 characters");
    });
  });

  describe("POST /api/auth/login", () => {
    it("responde 200 con token y usuario", async () => {
      const email = uniqueEmail();
      const password = "secret123";
      await request(app).post("/api/auth/register").send({ name: "Oliver", email, password });

      const res = await request(app).post("/api/auth/login").send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("responde 401 con password incorrecta", async () => {
      const email = uniqueEmail();
      await request(app).post("/api/auth/register").send({ name: "Oliver", email, password: "secret123" });

      const res = await request(app).post("/api/auth/login").send({ email, password: "wrong-pass" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("responde 401 si el usuario no existe", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@example.com", password: "secret123" });

      expect(res.status).toBe(401);
    });

    it("responde 400 si faltan credenciales", async () => {
      const res = await request(app).post("/api/auth/login").send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email and password are required");
    });
  });

  describe("GET /api/auth/me", () => {
    it("responde 200 con el usuario autenticado", async () => {
      const user = await createTestUser();
      const login = await request(app)
        .post("/api/auth/login")
        .send({ email: user.email, password: "secret123" });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${login.body.data.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.password).toBeUndefined();
    });

    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Missing or invalid authorization header");
    });

    it("responde 401 con token inválido", async () => {
      const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer token-invalido");

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid or expired token");
    });
  });
});
