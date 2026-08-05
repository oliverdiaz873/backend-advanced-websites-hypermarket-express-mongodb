import express from "express";
import request from "supertest";
import { UserModel } from "../../../src/modules/users/models/user.model";
import { InventoryModel } from "../../../src/modules/inventory/models/inventory.model";
import { OrderModel } from "../../../src/modules/orders/models/order.model";
import errorHandler from "../../../src/shared/middleware/error-handler";

const buildApp = () => {
  const app = express();
  app.get("/duplicate", async (req, res, next) => {
    try {
      const email = "dup-handler@example.com";
      await UserModel.create({
        name: "A",
        email,
        password: "secret123",
        role: "customer",
      });
      await UserModel.create({
        name: "B",
        email,
        password: "secret123",
        role: "customer",
      });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/validation", async (req, res, next) => {
    try {
      await InventoryModel.create({ productId: "prod_x", stock: -5, reservedStock: 0 });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.get("/cast", async (req, res, next) => {
    try {
      await OrderModel.findById("id-no-valid");
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  });

  app.use(errorHandler);
  return app;
};

describe("error-handler con Mongo real", () => {
  const app = buildApp();

  it("mapea duplicate key (11000) a 409", async () => {
    const res = await request(app).get("/duplicate");

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      success: false,
      message: "Duplicate value: resource already exists",
      statusCode: 409,
      code: "CONFLICT",
    });
  });

  it("mapea ValidationError a 400 con el mensaje de Mongoose", async () => {
    const res = await request(app).get("/validation");

    expect(res.status).toBe(400);
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toContain("stock");
    expect(res.body.success).toBe(false);
  });

  it("mapea CastError a 400 con mensaje de id inválido", async () => {
    const res = await request(app).get("/cast");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      message: "Invalid identifier format",
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  });
});
