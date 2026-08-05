import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/app";

describe("E2E: health / readiness", () => {
  it("/health responde 200 con uptime, timestamp y database (liveness)", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("connected");
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("/ready responde 200 con status ready cuando Mongo está conectado", async () => {
    const res = await request(app).get("/ready");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready");
    expect(res.body.database).toBe("connected");
  });

  it("/ready responde 503 unavailable cuando Mongo no está listo", async () => {
    const original = mongoose.connection.readyState;
    Object.defineProperty(mongoose.connection, "readyState", {
      value: 0,
      writable: true,
      configurable: true,
    });

    try {
      const res = await request(app).get("/ready");
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("unavailable");
      expect(res.body.database).toBe("disconnected");
    } finally {
      Object.defineProperty(mongoose.connection, "readyState", {
        value: original,
        writable: true,
        configurable: true,
      });
    }
  });

  it("la cabecera X-Request-ID está presente en las respuestas de health", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});