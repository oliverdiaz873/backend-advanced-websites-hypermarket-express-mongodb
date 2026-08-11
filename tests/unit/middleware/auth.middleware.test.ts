import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import authMiddleware from "../../../src/shared/middleware/auth.middleware";
import { USER_ID } from "../factories/user.factory";
import { createAuthToken } from "../helpers/test-app";

const buildApp = (): express.Express => {
  const app = express();
  app.use(cookieParser());
  app.get("/protected", authMiddleware, (req, res) => {
    res.json({ ok: true, user: req.user });
  });
  return app;
};

describe("auth.middleware", () => {
  const app = buildApp();

  it("responde 401 si falta el header Authorization", async () => {
    const res = await request(app).get("/protected");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      success: false,
      message: "Missing or invalid authorization header",
      statusCode: 401,
    });
  });

  it("responde 401 si el header no usa el esquema Bearer", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Token abc");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Missing or invalid authorization header");
  });

  it("responde 401 si el token es inválido", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer token-invalido");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });

  it("llama next() y expone req.user con un token válido", async () => {
    const token = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

    const res = await request(app).get("/protected").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user).toEqual({ id: USER_ID, email: "oliver@example.com", role: "customer" });
  });

  it("autentica con el token en la cookie httpOnly (sin header Bearer)", async () => {
    const token = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

    const res = await request(app)
      .get("/protected")
      .set("Cookie", `hypermarket_auth=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: USER_ID, email: "oliver@example.com", role: "customer" });
  });

  it("privilegia el header Bearer sobre la cookie", async () => {
    const validToken = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });
    const badToken = createAuthToken({ id: "otro", email: "otro@example.com", role: "customer" });

    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Bearer ${validToken}`)
      .set("Cookie", `hypermarket_auth=${badToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(USER_ID);
  });

  it("responde 401 si la cookie es inválida y no hay header Bearer", async () => {
    const res = await request(app).get("/protected").set("Cookie", "hypermarket_auth=token-invalido");

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired token");
  });
});
