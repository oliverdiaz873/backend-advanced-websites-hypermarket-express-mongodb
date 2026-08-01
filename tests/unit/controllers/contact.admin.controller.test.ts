import request from "supertest";
import adminContactRoutes from "../../../src/modules/contact/routes/admin-contact.routes";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeContactMessage, CONTACT_ID } from "../factories/contact.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/contact/services/contact.service", () =>
  require("../mocks/repositories").mockContactService
);

import { mockContactService } from "../mocks/repositories";

const app = createTestApp("/api/admin/contact", adminContactRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("contact.admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/contact", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/contact");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app).get("/api/admin/contact").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(mockContactService.findAllAdmin).not.toHaveBeenCalled();
    });

    it("responde 200 con todos los mensajes (admin)", async () => {
      const messages = [makeContactMessage()];
      mockContactService.findAllAdmin.mockResolvedValue(messages);

      const res = await request(app).get("/api/admin/contact").set("Authorization", `Bearer ${adminToken}`);

      expect(mockContactService.findAllAdmin).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(messages) });
    });
  });

  describe("GET /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get(`/api/admin/contact/${CONTACT_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el mensaje (admin)", async () => {
      const message = makeContactMessage();
      mockContactService.findByIdAdmin.mockResolvedValue(message);

      const res = await request(app)
        .get(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockContactService.findByIdAdmin).toHaveBeenCalledWith(CONTACT_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(message));
    });

    it("responde 404 si el mensaje no existe", async () => {
      mockContactService.findByIdAdmin.mockRejectedValue(new NotFoundError("Contact message not found"));

      const res = await request(app)
        .get(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Contact message not found");
    });
  });

  describe("PATCH /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).patch(`/api/admin/contact/${CONTACT_ID}`).send({ status: "read" });

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .patch(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "read" });

      expect(res.status).toBe(403);
    });

    it("responde 400 si falta status", async () => {
      const res = await request(app)
        .patch(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Missing required fields: status");
    });

    it("actualiza el estado y responde 200 (admin)", async () => {
      const updated = makeContactMessage({ status: "read" });
      mockContactService.updateStatusAdmin.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "read" });

      expect(mockContactService.updateStatusAdmin).toHaveBeenCalledWith(CONTACT_ID, "read");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });

    it("responde 400 si la transición es inválida", async () => {
      mockContactService.updateStatusAdmin.mockRejectedValue(
        new InvalidDataError("Cannot transition from answered to pending")
      );

      const res = await request(app)
        .patch(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "pending" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cannot transition from answered to pending");
    });

    it("responde 404 si el mensaje no existe", async () => {
      mockContactService.updateStatusAdmin.mockRejectedValue(new NotFoundError("Contact message not found"));

      const res = await request(app)
        .patch(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "read" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Contact message not found");
    });
  });

  describe("DELETE /api/admin/contact/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).delete(`/api/admin/contact/${CONTACT_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .delete(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(mockContactService.remove).not.toHaveBeenCalled();
    });

    it("borra el mensaje y responde 204 (admin)", async () => {
      mockContactService.remove.mockResolvedValue(undefined);

      const res = await request(app)
        .delete(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockContactService.remove).toHaveBeenCalledWith(CONTACT_ID);
      expect(res.status).toBe(204);
    });

    it("responde 404 si el mensaje no existe", async () => {
      mockContactService.remove.mockRejectedValue(new NotFoundError("Contact message not found"));

      const res = await request(app)
        .delete(`/api/admin/contact/${CONTACT_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Contact message not found");
    });
  });
});
