import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../src/app";
import config from "../../../src/config";
import { createTestUser } from "../helpers/user.helper";
import { uniqueTestIp } from "../../helpers/rate-limit.helper";

const uniqueEmail = (): string =>
  `auth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;

const withIp = (): { "X-Forwarded-For": string } => ({ "X-Forwarded-For": uniqueTestIp() });

const cookieValue = (setCookie: string | string[] | undefined): string | undefined =>
  Array.isArray(setCookie) ? setCookie[0]?.split(";")[0] : setCookie?.split(";")[0];

describe("E2E: /api/auth", () => {
  describe("POST /api/auth/register", () => {
    it("registra un usuario y responde 201 sin password", async () => {
      const res = await request(app).post("/api/auth/register").set(withIp()).send({
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
      const res = await request(app).post("/api/auth/register").set(withIp()).send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: email, password");
    });

    it("responde 409 si el email ya está registrado", async () => {
      const email = uniqueEmail();
      await request(app).post("/api/auth/register").set(withIp()).send({ name: "A", email, password: "secret123" });

      const res = await request(app).post("/api/auth/register").set(withIp()).send({ name: "B", email, password: "secret123" });

      expect(res.status).toBe(409);
      expect(res.body.message).toBe("Email already exists");
    });

    it("responde 400 si el password es demasiado corto", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .set(withIp())
        .send({ name: "A", email: uniqueEmail(), password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Password must be at least 6 characters");
    });
  });

  describe("POST /api/auth/login", () => {
    it("responde 200 con token y usuario", async () => {
      const email = uniqueEmail();
      const password = "secret123";
      await request(app).post("/api/auth/register").set(withIp()).send({ name: "Oliver", email, password });

      const res = await request(app).post("/api/auth/login").set(withIp()).send({ email, password });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeTruthy();
      expect(res.body.data.user.email).toBe(email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it("responde 200 con cookie httpOnly de sesión", async () => {
      const email = uniqueEmail();
      await request(app).post("/api/auth/register").set(withIp()).send({ name: "Oliver", email, password: "secret123" });

      const res = await request(app).post("/api/auth/login").set(withIp()).send({ email, password: "secret123" });

      expect(res.headers["set-cookie"]).toBeDefined();
      const cookie = res.headers["set-cookie"]?.[0] ?? "";
      expect(cookie).toMatch(/^hypermarket_auth=/);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toMatch(/Max-Age=\d+/i);
      expect(cookie).toContain(res.body.data.token);
    });

    it("no emite cookie si el login falla", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set(withIp())
        .send({ email: "ghost@example.com", password: "secret123" });

      expect(res.status).toBe(401);
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("responde 401 con password incorrecta", async () => {
      const email = uniqueEmail();
      await request(app).post("/api/auth/register").set(withIp()).send({ name: "Oliver", email, password: "secret123" });

      const res = await request(app).post("/api/auth/login").set(withIp()).send({ email, password: "wrong-pass" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid credentials");
    });

    it("responde 401 si el usuario no existe", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set(withIp())
        .send({ email: "ghost@example.com", password: "secret123" });

      expect(res.status).toBe(401);
    });

    it("responde 400 si faltan credenciales", async () => {
      const res = await request(app).post("/api/auth/login").set(withIp()).send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Email and password are required");
    });

    it("responde 429 tras superar el límite de intentos desde la misma IP", async () => {
      const ip = uniqueTestIp();
      const attempt = () =>
        request(app)
          .post("/api/auth/login")
          .set("X-Forwarded-For", ip)
          .send({ email: "ghost@example.com", password: "secret123" });

      for (let i = 0; i < 10; i++) {
        const res = await attempt();
        expect(res.status).toBe(401);
      }

      const rateLimited = await attempt();
      expect(rateLimited.status).toBe(429);
      expect(rateLimited.body).toMatchObject({
        success: false,
        message: "Too many login attempts, please try again later",
        statusCode: 429,
        code: "RATE_LIMITED",
      });
      expect(rateLimited.headers["retry-after"]).toMatch(/^\d+$/);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("responde 200 y borra la cookie de sesión", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const cookie = res.headers["set-cookie"]?.[0] ?? "";
      expect(cookie).toMatch(/^hypermarket_auth=/);
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toMatch(/(Max-Age=0|Expires=Thu, 01 Jan 1970)/i);
    });
  });

  describe("GET /api/auth/me", () => {
    it("responde 200 con el usuario autenticado", async () => {
      const user = await createTestUser();
      const login = await request(app)
        .post("/api/auth/login")
        .set(withIp())
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

    it("responde 200 con la cookie de sesión (sin header Bearer)", async () => {
      const user = await createTestUser();
      const login = await request(app)
        .post("/api/auth/login")
        .set(withIp())
        .send({ email: user.email, password: "secret123" });

      const cookie = cookieValue(login.headers["set-cookie"]);
      expect(cookie).toBeTruthy();

      const res = await request(app).get("/api/auth/me").set("Cookie", cookie as string);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(user.email);
    });

    it("responde 401 si el usuario no existe (token de un id eliminado)", async () => {
      const token = jwt.sign(
        { id: "507f1f77bcf86cd799439011", email: "ghost@example.com", role: "customer" },
        config.jwtSecret,
        { expiresIn: "1h" }
      );

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("User not found");
    });
  });
});
