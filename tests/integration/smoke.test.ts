import request from "supertest";
import mongoose from "mongoose";
import config from "../../src/config";
import app from "../../src/app";

describe("smoke: infraestructura de integración", () => {
  it("está conectado a MongoDB (MongoMemoryServer)", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it("config.mongodbUri apunta a la instancia de memoria, no al localhost de dev", () => {
    expect(config.mongodbUri).toMatch(/^mongodb:\/\/127\.0\.0\.1:/);
    expect(config.mongodbUri).not.toBe("mongodb://localhost:27017/hypermarket");
  });

  it("JWT_SECRET está configurado para firmar/verificar tokens", () => {
    expect(config.jwtSecret).toBeTruthy();
  });

  it("config.appVersion tiene un valor por defecto", () => {
    expect(config.appVersion).toBeTruthy();
  });
});

describe("E2E: /api/health", () => {
  it("responde 200 con estado, versión y estado de Mongo", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.mongo).toBe("connected");
    expect(typeof res.body.version).toBe("string");
    expect(res.body.version.length).toBeGreaterThan(0);
    expect(typeof res.body.uptime).toBe("number");
    expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("E2E: headers de seguridad (helmet)", () => {
  it("incluye las cabeceras de seguridad por defecto", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["strict-transport-security"]).toBe("max-age=31536000; includeSubDomains");
    expect(res.headers["x-download-options"]).toBe("noopen");
  });
});
