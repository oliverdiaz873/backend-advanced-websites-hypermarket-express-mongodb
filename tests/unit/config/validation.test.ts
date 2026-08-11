import { assertValidConfig } from "../../../src/config/validation";
import type { Config } from "../../../src/types";

const baseConfig: Config = {
  port: 3000,
  nodeEnv: "development",
  appVersion: "1.0.0",
  jwtSecret: "secret",
  jwtExpiresIn: "1d",
  corsOrigin: ["http://localhost:4200"],
  authCookieName: "hypermarket_auth",
  authCookieHttpOnly: true,
  authCookieSameSite: "lax",
  authCookieMaxAgeSeconds: 86400,
  authCookieSecure: false,
  mongodbUri: "mongodb://localhost:27017/hypermarket",
  backupDir: "backups",
  rateLimitWindowMs: 900_000,
  rateLimitMaxRequests: 300,
  storageProvider: "local",
  storageLocalDir: ".tmp/test",
  storagePublicBaseUrl: "http://localhost:3001",
  uploadMaxSizeBytes: 5 * 1024 * 1024,
  uploadPresignExpiresSeconds: 600,
};

describe("config validation", () => {
  it("no lanza con una configuración válida", () => {
    expect(() => assertValidConfig(baseConfig)).not.toThrow();
  });

  it("lanza en producción si falta JWT_SECRET", () => {
    const config = { ...baseConfig, nodeEnv: "production", jwtSecret: "" };

    expect(() => assertValidConfig(config)).toThrow("JWT_SECRET");
  });

  it("lanza en producción si falta MONGODB_URI", () => {
    const config = { ...baseConfig, nodeEnv: "production", mongodbUri: "" };

    expect(() => assertValidConfig(config)).toThrow("MONGODB_URI");
  });

  it("lanza en producción si MONGODB_URI no es una cadena de conexión válida", () => {
    const config = { ...baseConfig, nodeEnv: "production", mongodbUri: "no-es-mongodb" };

    expect(() => assertValidConfig(config)).toThrow("MONGODB_URI");
  });

  it("lanza en producción si CORS_ORIGIN está vacío", () => {
    const config = { ...baseConfig, nodeEnv: "production", corsOrigin: [] };

    expect(() => assertValidConfig(config)).toThrow("CORS_ORIGIN");
  });

  it("lanza si AUTH_COOKIE_SAMESITE no es válido", () => {
    const config = {
      ...baseConfig,
      nodeEnv: "production",
      authCookieSameSite: "none-invalido" as "lax",
    };

    expect(() => assertValidConfig(config)).toThrow("AUTH_COOKIE_SAMESITE");
  });

  it("lanza si AUTH_COOKIE_MAX_AGE_SECONDS no es un entero positivo", () => {
    const config = { ...baseConfig, nodeEnv: "production", authCookieMaxAgeSeconds: 0 };

    expect(() => assertValidConfig(config)).toThrow("AUTH_COOKIE_MAX_AGE_SECONDS");
  });

  it("lanza en producción si PORT no es un entero positivo", () => {
    const config = { ...baseConfig, nodeEnv: "production", port: 0 };

    expect(() => assertValidConfig(config)).toThrow("PORT");
  });

  it("lanza en producción si NODE_ENV es inválido", () => {
    const config = { ...baseConfig, nodeEnv: "staging" };

    expect(() => assertValidConfig(config)).toThrow("NODE_ENV");
  });

  it("no lanza fuera de producción aunque falten campos", () => {
    const config = { ...baseConfig, jwtSecret: "", mongodbUri: "", corsOrigin: [] };

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => assertValidConfig(config)).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
