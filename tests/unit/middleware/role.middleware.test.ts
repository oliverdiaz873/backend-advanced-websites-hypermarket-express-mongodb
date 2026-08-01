import express from "express";
import request from "supertest";
import authMiddleware, { authorizeRole } from "../../../src/shared/middleware/auth.middleware";
import { USER_ID } from "../factories/user.factory";
import { createAuthToken } from "../helpers/test-app";

const buildApp = (): express.Express => {
  const app = express();
  app.get("/admin", authMiddleware, authorizeRole("admin"), (req, res) => {
    res.json({ ok: true, role: req.user!.role });
  });
  app.get("/own", authorizeRole("admin"), (req, res) => {
    res.json({ ok: true });
  });
  return app;
};

describe("role.middleware (authorizeRole)", () => {
  const app = buildApp();

  it("responde 401 si req.user no existe", async () => {
    const res = await request(app).get("/own");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ success: false, message: "Authentication required", statusCode: 401 });
  });

  it("responde 403 si el rol no está permitido", async () => {
    const token = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

    const res = await request(app).get("/admin").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      message: "Forbidden: insufficient permissions",
      statusCode: 403,
    });
  });

  it("permite el acceso si el rol está permitido", async () => {
    const token = createAuthToken({ id: USER_ID, email: "admin@example.com", role: "admin" });

    const res = await request(app).get("/admin").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
  });
});
