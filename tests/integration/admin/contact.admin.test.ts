import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestContactMessage } from "../helpers/contact.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/admin/contact", () => {
  let admin: User;
  let customer: User;
  let adminHeaders: { Authorization: string };
  let customerHeaders: { Authorization: string };

  beforeEach(async () => {
    admin = await createTestAdmin();
    customer = await createTestUser();
    adminHeaders = createAuthHeaders(createAuthToken(admin));
    customerHeaders = createAuthHeaders(createAuthToken(customer));
  });

  describe("GET /api/admin/contact", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/contact");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/contact").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con todos los mensajes para admin", async () => {
      const message = await createTestContactMessage();

      const res = await request(app).get("/api/admin/contact").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.map((m: { id: string }) => m.id)).toContain(message.id);
    });
  });

  describe("GET /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/contact/64b000000000000000000000a");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/contact/64b000000000000000000000a").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con el mensaje para admin", async () => {
      const message = await createTestContactMessage();

      const res = await request(app).get(`/api/admin/contact/${message.id}`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(message.id);
    });

    it("responde 404 si el mensaje no existe", async () => {
      const res = await request(app).get("/api/admin/contact/64b000000000000000000000a").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch("/api/admin/contact/64b000000000000000000000a").send({ status: "read" });
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const message = await createTestContactMessage();
      const res = await request(app).patch(`/api/admin/contact/${message.id}`).set(customerHeaders).send({ status: "read" });
      expect(res.status).toBe(403);
    });

    it("responde 400 si falta status", async () => {
      const message = await createTestContactMessage();
      const res = await request(app).patch(`/api/admin/contact/${message.id}`).set(adminHeaders).send({});
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: status");
    });

    it("actualiza pending → read para admin", async () => {
      const message = await createTestContactMessage();

      const res = await request(app)
        .patch(`/api/admin/contact/${message.id}`)
        .set(adminHeaders)
        .send({ status: "read" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("read");
    });

    it("actualiza pending → answered y read → answered", async () => {
      const message = await createTestContactMessage();

      const answered = await request(app)
        .patch(`/api/admin/contact/${message.id}`)
        .set(adminHeaders)
        .send({ status: "answered" });
      expect(answered.status).toBe(200);
      expect(answered.body.data.status).toBe("answered");

      const regress = await request(app)
        .patch(`/api/admin/contact/${message.id}`)
        .set(adminHeaders)
        .send({ status: "read" });
      expect(regress.status).toBe(400);
      expect(regress.body.message).toBe("Cannot transition from answered to read");
    });

    it("responde 404 si el mensaje no existe", async () => {
      const res = await request(app)
        .patch("/api/admin/contact/64b000000000000000000000a")
        .set(adminHeaders)
        .send({ status: "read" });
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete("/api/admin/contact/64b000000000000000000000a");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const message = await createTestContactMessage();
      const res = await request(app).delete(`/api/admin/contact/${message.id}`).set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 204 y borra el mensaje para admin", async () => {
      const message = await createTestContactMessage();

      const res = await request(app).delete(`/api/admin/contact/${message.id}`).set(adminHeaders);

      expect(res.status).toBe(204);
      const missing = await request(app).get(`/api/admin/contact/${message.id}`).set(adminHeaders);
      expect(missing.status).toBe(404);
    });

    it("responde 404 si el mensaje no existe", async () => {
      const res = await request(app)
        .delete("/api/admin/contact/64b000000000000000000000a")
        .set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });
});
