import request from "supertest";
import customerRoutes from "../../../src/modules/customers/routes/customer.routes";
import { makeCustomer, makeCustomerStats, CUSTOMER_ID } from "../factories/customer.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/customers/services/customer.service", () =>
  require("../mocks/repositories").mockCustomerService
);

import { mockCustomerService } from "../mocks/repositories";

const app = createTestApp("/api/admin/customers", customerRoutes);
const customerToken = createAuthToken({ id: CUSTOMER_ID, email: "oliver@example.com", role: "customer" });
const adminId = "64b000000000000000000001";
const adminToken = createAuthToken({ id: adminId, email: "admin@example.com", role: "admin" });

describe("customer.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/customers", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/customers");
      expect(res.status).toBe(401);
    });

    it("responde 403 si el usuario no es admin", async () => {
      const res = await request(app).get("/api/admin/customers").set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Forbidden: insufficient permissions");
    });

    it("responde 200 con data + pagination (admin)", async () => {
      mockCustomerService.getPage.mockResolvedValue({
        items: [makeCustomer()],
        total: 1,
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });

      const res = await request(app).get("/api/admin/customers").set("Authorization", `Bearer ${adminToken}`).query({ page: 1, limit: 20 });

      expect(mockCustomerService.getPage).toHaveBeenCalledWith({ page: "1", limit: "20" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        data: toJson([makeCustomer()]),
        pagination: { page: 1, limit: 20, total: 1, pages: 1 },
      });
    });
  });

  describe("GET /api/admin/customers/stats", () => {
    it("responde 200 con los KPIs (admin)", async () => {
      mockCustomerService.getStats.mockResolvedValue(makeCustomerStats());

      const res = await request(app).get("/api/admin/customers/stats").set("Authorization", `Bearer ${adminToken}`);

      expect(mockCustomerService.getStats).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(makeCustomerStats()) });
    });
  });

  describe("GET /api/admin/customers/:id", () => {
    it("responde 200 con el cliente (admin)", async () => {
      mockCustomerService.getById.mockResolvedValue(makeCustomer());

      const res = await request(app)
        .get(`/api/admin/customers/${CUSTOMER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockCustomerService.getById).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(makeCustomer()));
    });
  });

  describe("PATCH /api/admin/customers/:id/status", () => {
    it("responde 400 si falta status", async () => {
      const res = await request(app)
        .patch(`/api/admin/customers/${CUSTOMER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Missing required fields: status");
      expect(mockCustomerService.updateStatus).not.toHaveBeenCalled();
    });

    it("actualiza el status y responde 200 (admin)", async () => {
      const updated = makeCustomer({ status: "blocked" });
      mockCustomerService.updateStatus.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/admin/customers/${CUSTOMER_ID}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "blocked" });

      expect(mockCustomerService.updateStatus).toHaveBeenCalledWith(CUSTOMER_ID, "blocked", adminId);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("PATCH /api/admin/customers/:id", () => {
    it("actualiza un cliente y responde 200 (admin)", async () => {
      const updated = makeCustomer({ phone: "809-000-0000" });
      mockCustomerService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/admin/customers/${CUSTOMER_ID}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ phone: "809-000-0000" });

      expect(mockCustomerService.updateById).toHaveBeenCalledWith(CUSTOMER_ID, { phone: "809-000-0000" }, adminId);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });
});