import request from "supertest";
import app from "../../../src/app";
import { AuditLogModel } from "../../../src/modules/audit/models/audit-log.model";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import type { User } from "../../../src/types";

const createLog = (data: Record<string, unknown>) =>
  AuditLogModel.create({
    userId: "64b00000000000000000000001",
    userName: "Oliver Diaz",
    action: "LOGIN",
    resource: "auth",
    success: true,
    ...data,
  } as never);

describe("E2E: /api/admin/audit-logs", () => {
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

  describe("GET /api/admin/audit-logs", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/audit-logs");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/audit-logs").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con todos los logs y paginación, exponiendo entity/entityId", async () => {
      await createLog({ action: "LOGIN" });
      await createLog({ action: "CREATE_ORDER", resource: "order", resourceId: "o1" });

      const res = await request(app).get("/api/admin/audit-logs").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toMatchObject({ page: 1, total: 2 });
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].entity).toBeDefined();
      expect(res.body.data[0].action).toBe("CREATE_ORDER");
    });

    it("filtra por action y entity", async () => {
      await createLog({ action: "LOGIN", resource: "auth" });
      await createLog({ action: "UPDATE_ORDER_STATUS", resource: "order", resourceId: "o1" });

      const res = await request(app)
        .get("/api/admin/audit-logs?action=LOGIN&entity=auth")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe("LOGIN");
    });

    it("filtra por entityId y userId", async () => {
      await createLog({ action: "INVENTORY_ADJUST", resource: "inventory", resourceId: "prod_1" });

      const byEntityId = await request(app)
        .get("/api/admin/audit-logs?entityId=prod_1")
        .set(adminHeaders);
      expect(byEntityId.body.data).toHaveLength(1);

      const byUser = await request(app)
        .get("/api/admin/audit-logs?userId=64b00000000000000000000001")
        .set(adminHeaders);
      expect(byUser.body.data).toHaveLength(1);
    });

    it("filtra por rango de fechas from/to (date-only incluye el día completo)", async () => {
      await createLog({ action: "LOGIN", createdAt: new Date("2026-01-05T10:00:00.000Z") });
      await createLog({ action: "REGISTER", createdAt: new Date("2026-01-15T09:30:00.000Z") });
      await createLog({ action: "LOGIN", createdAt: new Date("2026-02-01T00:00:00.000Z") });

      const res = await request(app)
        .get("/api/admin/audit-logs?from=2026-01-10&to=2026-01-31")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe("REGISTER");
    });

    it("busca con q sobre action, userName y resourceId", async () => {
      await createLog({ action: "LOGIN", userName: "Ana Perez" });
      await createLog({ action: "INVENTORY_RELEASE", resource: "inventory", resourceId: "prod_77" });

      const byAction = await request(app).get("/api/admin/audit-logs?q=login").set(adminHeaders);
      expect(byAction.body.data.map((l: { action: string }) => l.action)).toEqual(["LOGIN"]);

      const byName = await request(app).get("/api/admin/audit-logs?q=perez").set(adminHeaders);
      expect(byName.body.data).toHaveLength(1);

      const byResourceId = await request(app).get("/api/admin/audit-logs?q=prod_77").set(adminHeaders);
      expect(byResourceId.body.data).toHaveLength(1);
    });

    it("paginación: page 2 con limit 1 devuelve el segundo log más reciente", async () => {
      await createLog({ action: "LOGIN", createdAt: new Date("2026-01-01T00:00:00.000Z") });
      await createLog({ action: "REGISTER", createdAt: new Date("2026-02-01T00:00:00.000Z") });

      const res = await request(app).get("/api/admin/audit-logs?page=2&limit=1").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe("LOGIN");
      expect(res.body.pagination.page).toBe(2);
    });
  });

  describe("GET /api/admin/audit-logs/:id", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/audit-logs/64b0000000000000000000000a");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/audit-logs/64b0000000000000000000000a").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("responde 200 con el log completo (details + timestamps) como entity/entityId", async () => {
      const log = await createLog({
        action: "INVENTORY_ADJUST",
        resource: "inventory",
        resourceId: "prod_1",
        details: { operation: "increase", quantity: 5 },
      });

      const res = await request(app).get(`/api/admin/audit-logs/${log.id}`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(log.id);
      expect(res.body.data.entity).toBe("inventory");
      expect(res.body.data.entityId).toBe("prod_1");
      expect(res.body.data.details).toEqual({ operation: "increase", quantity: 5 });
      expect(res.body.data.createdAt).toBeDefined();
    });

    it("responde 404 si el log no existe", async () => {
      const res = await request(app).get("/api/admin/audit-logs/64b0000000000000000000000a").set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });
});
