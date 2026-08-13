import request from "supertest";
import express from "express";
import app from "../../src/app";
import errorHandler from "../../src/shared/middleware/error-handler";
import { createTestUser, createTestAdmin } from "./helpers/user.helper";
import { createAuthToken, createAuthHeaders } from "./helpers/auth.helper";
import { uniqueTestIp } from "../helpers/rate-limit.helper";

const validMessage = {
  name: "Oliver Diaz",
  email: "oliver@example.com",
  message: "Consulta sobre un pedido",
};

describe("E4.7 Retry-After: solo en respuestas 429", () => {
  it("429 del rate-limit incluye Retry-After y mantiene el body contract", async () => {
    const ip = uniqueTestIp();

    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/contact")
        .set("X-Forwarded-For", ip)
        .send(validMessage)
        .expect(201);
    }

    const res = await request(app).post("/api/contact").set("X-Forwarded-For", ip).send(validMessage);

    expect(res.status).toBe(429);
    expect(res.headers["retry-after"]).toMatch(/^\d+$/);
    expect(Number(res.headers["retry-after"])).toBeGreaterThanOrEqual(1);
    expect(res.body).toMatchObject({
      success: false,
      message: "Too many messages, please try again later",
      statusCode: 429,
      code: "RATE_LIMITED",
    });
  });

  it("400 (validación) no incluye Retry-After", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", uniqueTestIp())
      .send({ name: "Oliver Diaz" });

    expect(res.status).toBe(400);
    expect(res.headers["retry-after"]).toBeUndefined();
    expect(res.body).toMatchObject({ success: false, statusCode: 400 });
  });

  it("401 (sin token) no incluye Retry-After", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.headers["retry-after"]).toBeUndefined();
  });

  it("403 (permisos insuficientes) no incluye Retry-After", async () => {
    const customer = await createTestUser();
    const admin = await createTestAdmin();
    const headers = createAuthHeaders(createAuthToken(customer));

    const res = await request(app).get(`/api/users/${admin.id}`).set(headers);

    expect(res.status).toBe(403);
    expect(res.headers["retry-after"]).toBeUndefined();
  });

  it("404 (ruta inexistente) no incluye Retry-After", async () => {
    const res = await request(app).get("/api/ruta-que-no-existe");

    expect(res.status).toBe(404);
    expect(res.headers["retry-after"]).toBeUndefined();
  });

  it("500 (error interno) no incluye Retry-After", async () => {
    const mini = express();
    mini.get("/boom", (_req, _res, next) => next(new Error("boom")));
    mini.use(errorHandler);

    const res = await request(mini).get("/boom");

    expect(res.status).toBe(500);
    expect(res.headers["retry-after"]).toBeUndefined();
    expect(res.body).toMatchObject({ success: false, statusCode: 500 });
  });
});