import request from "supertest";
import express from "express";
import { rateLimit } from "../../../src/shared/middleware/rate-limit.middleware";
import {
  isGeneralRateLimitEnabled,
  applyGeneralRateLimit,
} from "../../../src/shared/middleware/general-rate-limit";

const buildApp = (windowMs: number, max: number) => {
  const app = express();
  app.use(rateLimit({ windowMs, max }));
  app.get("/ping", (_req, res) => res.json({ ok: true }));
  return app;
};

describe("rate-limit middleware", () => {
  it("deja pasar mientras no se supera el máximo por IP", async () => {
    const app = buildApp(60_000, 2);
    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").expect(200);
  });

  it("responde 429 con RATE_LIMITED al superar el máximo", async () => {
    const app = buildApp(60_000, 2);
    await request(app).get("/ping");
    await request(app).get("/ping");
    const res = await request(app).get("/ping");

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({
      success: false,
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later",
    });
  });

  it("aplica el límite por IP de forma independiente con trust proxy", async () => {
    const app = express();
    app.set("trust proxy", 1);
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    app.use((req, res, next) => limiter(req, res, next));
    app.get("/ping", (_req, res) => res.json({ ok: true }));

    await request(app).get("/ping").expect(200);
    await request(app).get("/ping").set("X-Forwarded-For", "10.0.0.5").expect(200);
  });
});

describe("isGeneralRateLimitEnabled", () => {
  it("se desactiva en entorno test", () => {
    expect(isGeneralRateLimitEnabled("test")).toBe(false);
  });

  it("se activa en producción y desarrollo", () => {
    expect(isGeneralRateLimitEnabled("production")).toBe(true);
    expect(isGeneralRateLimitEnabled("development")).toBe(true);
    expect(isGeneralRateLimitEnabled(undefined)).toBe(true);
  });
});

describe("applyGeneralRateLimit", () => {
  it("repite sin limitar cuando el entorno es dev/test", async () => {
    const app = express();
    app.use(applyGeneralRateLimit);
    app.get("/ping", (_req, res) => res.json({ ok: true }));

    await request(app).get("/ping").expect(200);
  });
});