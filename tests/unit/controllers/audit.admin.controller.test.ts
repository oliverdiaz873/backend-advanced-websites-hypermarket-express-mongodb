import request from "supertest";
import auditRoutes from "../../../src/modules/audit/routes/audit.routes";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeAuditLog, AUDIT_LOG_ID } from "../factories/audit.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/audit/services/audit.service", () =>
  require("../mocks/repositories").mockAuditService
);

import { mockAuditService } from "../mocks/repositories";

const app = createTestApp("/api/admin/audit-logs", auditRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "customer@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("audit.admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/admin/audit-logs", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/audit-logs");

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app).get("/api/admin/audit-logs").set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(mockAuditService.getPage).not.toHaveBeenCalled();
    });

    it("responde 200 con la página y paginación, exponiendo entity/entityId (alias API)", async () => {
      const log = makeAuditLog();
      const pagination = { page: 1, limit: 20, total: 1, pages: 1 };
      mockAuditService.getPage.mockResolvedValue({ items: [log], total: 1, pagination });

      const res = await request(app).get("/api/admin/audit-logs").set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toEqual(pagination);
      expect(res.body.data).toEqual([
        {
          id: log.id,
          userId: log.userId,
          userName: log.userName,
          action: log.action,
          entity: log.resource,
          entityId: log.resourceId,
          success: log.success,
          details: log.details,
          createdAt: toJson(log.createdAt),
        },
      ]);
      expect(res.body.data[0].entity).toBe("auth");
      expect(res.body.data[0]).not.toHaveProperty("resource");
    });

    it("pasa los filtros (page, limit, q, userId, action, entity, entityId, from, to) al servicio", async () => {
      mockAuditService.getPage.mockResolvedValue({ items: [], total: 0, pagination: { page: 2, limit: 10, total: 0, pages: 1 } });

      const res = await request(app)
        .get(
          "/api/admin/audit-logs?page=2&limit=10&q=login&userId=u1&action=LOGIN&entity=inventory&entityId=p1&from=2026-01-01&to=2026-01-10"
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockAuditService.getPage).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        q: "login",
        userId: "u1",
        action: "LOGIN",
        entity: "inventory",
        entityId: "p1",
        from: "2026-01-01",
        to: "2026-01-10",
        sortOrder: undefined,
      });
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/admin/audit-logs/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get(`/api/admin/audit-logs/${AUDIT_LOG_ID}`);

      expect(res.status).toBe(401);
    });

    it("responde 403 si no es admin", async () => {
      const res = await request(app)
        .get(`/api/admin/audit-logs/${AUDIT_LOG_ID}`)
        .set("Authorization", `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it("responde 200 con el log expuesto como entity/entityId", async () => {
      const log = makeAuditLog();
      mockAuditService.getById.mockResolvedValue(log);

      const res = await request(app)
        .get(`/api/admin/audit-logs/${AUDIT_LOG_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(mockAuditService.getById).toHaveBeenCalledWith(AUDIT_LOG_ID);
      expect(res.status).toBe(200);
      expect(res.body.data.entity).toBe("auth");
      expect(res.body.data.entityId).toBe(log.resourceId);
    });

    it("responde 404 si el log no existe", async () => {
      mockAuditService.getById.mockRejectedValue(new NotFoundError("Audit log not found"));

      const res = await request(app)
        .get(`/api/admin/audit-logs/${AUDIT_LOG_ID}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Audit log not found");
    });
  });
});
