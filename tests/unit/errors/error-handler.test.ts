import request from "supertest";
import express from "express";
import errorHandler, { toErrorResponse } from "../../../src/shared/middleware/error-handler";
import requestIdMiddleware from "../../../src/shared/middleware/request-id.middleware";

const buildApp = () => {
  const app = express();
  app.use(requestIdMiddleware);
  app.get("/not-found", () => {
    throw Object.assign(new Error("Resource not found"), { name: "NotFoundError", statusCode: 404 });
  });
  app.get("/boom", () => {
    throw new Error("something internal");
  });
  app.use(errorHandler);
  return app;
};

describe("toErrorResponse (dev vs prod)", () => {
  const mapped = { statusCode: 500, code: "INTERNAL_ERROR" as const, message: "Internal server error" };

  it("incluye stack cuando exposeStack es true (development)", () => {
    const body = toErrorResponse(mapped, "req-1", "Error: x\n at fn", true);
    expect(body.stack).toBe("Error: x\n at fn");
    expect(body.requestId).toBe("req-1");
    expect(body.success).toBe(false);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.statusCode).toBe(500);
  });

  it("nunca incluye stack cuando exposeStack es false (production)", () => {
    const body = toErrorResponse(mapped, "req-1", "Error: x\n at fn", false);
    expect(body.stack).toBeUndefined();
    expect(body.requestId).toBe("req-1");
    expect(body.message).toBe("Internal server error");
  });
});

describe("error-handler", () => {
  it("responde error de dominio con código y requestId", async () => {
    const app = buildApp();
    const res = await request(app).get("/not-found");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      message: "Resource not found",
      statusCode: 404,
      code: "NOT_FOUND",
    });
    expect(res.body.requestId).toBeDefined();
  });

  it("propaga el X-Request-ID recibido a la respuesta", async () => {
    const app = buildApp();
    const res = await request(app).get("/not-found").set("X-Request-ID", "trace-42");

    expect(res.status).toBe(404);
    expect(res.body.requestId).toBe("trace-42");
    expect(res.headers["x-request-id"]).toBe("trace-42");
  });

  it("mapea error desconocido a INTERNAL_ERROR 500", async () => {
    const app = buildApp();
    const res = await request(app).get("/boom");

    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
  });
});