import request from "supertest";
import express from "express";
import requestIdMiddleware from "../../../src/shared/middleware/request-id.middleware";

const buildApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.get("/ping", (req, res) => {
    res.json({ requestId: req.requestId });
  });
  return app;
};

describe("request-id middleware", () => {
  it("usa el X-Request-ID recibido y lo responde", async () => {
    const res = await request(buildApp()).get("/ping").set("X-Request-ID", "client-abc-123");

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"]).toBe("client-abc-123");
    expect(res.body.requestId).toBe("client-abc-123");
  });

  it("genera un UUID si no llega X-Request-ID", async () => {
    const res = await request(buildApp()).get("/ping");

    expect(res.status).toBe(200);
    const id = res.headers["x-request-id"] as string;
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(res.body.requestId).toBe(id);
  });

  it("rechaza headers demasiado largos y genera uno nuevo", async () => {
    const res = await request(buildApp())
      .get("/ping")
      .set("X-Request-ID", "x".repeat(100));

    expect(res.status).toBe(200);
    const id = res.headers["x-request-id"] as string;
    expect(id).toHaveLength(36);
    expect(id).not.toBe("x".repeat(100));
  });

  it("rechaza headers con caracteres inválidos", async () => {
    const res = await request(buildApp()).get("/ping").set("X-Request-ID", "bad id <script>");

    expect(res.status).toBe(200);
    expect(res.headers["x-request-id"] as string).toHaveLength(36);
  });

  it("siempre responde con el header X-Request-ID", async () => {
    const res = await request(buildApp()).get("/ping");

    expect(res.headers["x-request-id"]).toBeDefined();
  });
});