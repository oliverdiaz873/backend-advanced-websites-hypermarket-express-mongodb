import request from "supertest";
import app from "../../../src/app";
import { uniqueTestIp } from "../../helpers/rate-limit.helper";

const validMessage = {
  name: "Oliver Diaz",
  email: "oliver@example.com",
  message: "Consulta sobre un pedido",
};

describe("E2E: /api/contact", () => {
  it("POST / crea un mensaje y responde 201", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", uniqueTestIp())
      .send(validMessage);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ name: "Oliver Diaz", email: "oliver@example.com", status: "pending" });
  });

  it("POST / responde 400 si faltan campos", async () => {
    const res = await request(app)
      .post("/api/contact")
      .set("X-Forwarded-For", uniqueTestIp())
      .send({ name: "Oliver Diaz" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Missing required fields");
  });

  it("POST / supera el límite y responde 429 con IP exclusiva", async () => {
    const ip = uniqueTestIp();

    for (let i = 0; i < 10; i++) {
      const res = await request(app).post("/api/contact").set("X-Forwarded-For", ip).send(validMessage);
      expect(res.status).toBe(201);
    }

    const rateLimited = await request(app).post("/api/contact").set("X-Forwarded-For", ip).send(validMessage);

    expect(rateLimited.status).toBe(429);
    expect(rateLimited.body).toEqual({
      success: false,
      message: "Too many messages, please try again later",
      statusCode: 429,
    });
  });
});
