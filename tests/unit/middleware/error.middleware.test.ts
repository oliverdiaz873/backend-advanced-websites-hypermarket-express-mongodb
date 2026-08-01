import { Router } from "express";
import request from "supertest";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { UnauthorizedError } from "../../../src/shared/errors/unauthorized.error";
import { createTestApp } from "../helpers/test-app";

const buildApp = () => {
  const router = Router();
  router.get("/notfound", (req, res, next) => next(new NotFoundError("Resource missing")));
  router.get("/invalid", (req, res, next) => next(new InvalidDataError("Bad payload")));
  router.get("/unauthorized", (req, res, next) => next(new UnauthorizedError("Not authenticated")));
  router.get("/generic", (req, res, next) => next(new Error("boom")));
  return createTestApp("/", router);
};

describe("error.middleware", () => {
  const app = buildApp();

  it("responde 404 para NotFoundError", async () => {
    const res = await request(app).get("/notfound");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Resource missing", statusCode: 404 });
  });

  it("responde 400 para InvalidDataError", async () => {
    const res = await request(app).get("/invalid");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: "Bad payload", statusCode: 400 });
  });

  it("responde 401 para UnauthorizedError", async () => {
    const res = await request(app).get("/unauthorized");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Not authenticated", statusCode: 401 });
  });

  it("responde 500 para errores desconocidos", async () => {
    const res = await request(app).get("/generic");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: "boom", statusCode: 500 });
  });
});
