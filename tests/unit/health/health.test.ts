import { buildHealth, buildReadiness, dbState } from "../../../src/shared/health/health";

describe("health/readiness helpers", () => {
  it("dbState mapea los readyState de mongoose", () => {
    expect(dbState(1)).toBe("connected");
    expect(dbState(2)).toBe("connecting");
    expect(dbState(3)).toBe("disconnecting");
    expect(dbState(0)).toBe("disconnected");
    expect(dbState(-1)).toBe("disconnected");
  });

  it("buildHealth siempre responde status ok con database", () => {
    const health = buildHealth(1);
    expect(health.status).toBe("ok");
    expect(health.database).toBe("connected");
    expect(typeof health.uptime).toBe("number");
    expect(typeof health.timestamp).toBe("string");
  });

  it("buildReadiness con Mongo listo responde ready", () => {
    const readiness = buildReadiness(1);
    expect(readiness.status).toBe("ready");
    expect(readiness.database).toBe("connected");
  });

  it("buildReadiness sin Mongo responde unavailable (503)", () => {
    const readiness = buildReadiness(0);
    expect(readiness.status).toBe("unavailable");
    expect(readiness.database).toBe("disconnected");
  });
});