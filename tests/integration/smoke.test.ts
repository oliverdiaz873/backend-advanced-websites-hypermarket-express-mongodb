import mongoose from "mongoose";
import config from "../../src/config";

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
});
