import express from "express";
import request from "supertest";
import { validateRequiredFields } from "../../../src/shared/middleware/validation.middleware";

const buildApp = (): express.Express => {
  const app = express();
  app.use(express.json());
  app.post("/submit", validateRequiredFields(["name", "email"]), (req, res) => {
    res.json({ success: true, data: req.body });
  });
  return app;
};

describe("validation.middleware", () => {
  const app = buildApp();

  it("responde 400 listando los campos faltantes", async () => {
    const res = await request(app).post("/submit").send({ name: "Oliver" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Missing required fields: email",
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  });

  it("llama next() cuando están presentes todos los campos requeridos", async () => {
    const res = await request(app).post("/submit").send({ name: "Oliver", email: "oliver@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
