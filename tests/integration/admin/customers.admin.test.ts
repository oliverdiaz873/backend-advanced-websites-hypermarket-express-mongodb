import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestCustomer } from "../helpers/customer.helper";
import type { User } from "../../../src/types";

describe("E4.1 /api/admin/customers (CRUD admin de clientes)", () => {
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

  describe("GET /api/admin/customers", () => {
    it("responde 401 sin token", async () => {
      const res = await request(app).get("/api/admin/customers");
      expect(res.status).toBe(401);
    });

    it("responde 403 para customer", async () => {
      const res = await request(app).get("/api/admin/customers").set(customerHeaders);
      expect(res.status).toBe(403);
    });

    it("lista solo clientes (role customer) con envelope + paginación", async () => {
      const c1 = await createTestCustomer({ name: "Ana" });
      const c2 = await createTestCustomer({ name: "Beto" });

      const res = await request(app).get("/api/admin/customers").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 20 });
      const emails = res.body.data.map((c: { email: string }) => c.email);
      expect(emails).toEqual(expect.arrayContaining([c1.email, c2.email]));
      expect(emails).not.toContain(admin.email);
      expect(res.body.data[0]).not.toHaveProperty("password");
      expect(res.body.data[0]).not.toHaveProperty("role");
    });

    it("filtra por status", async () => {
      await createTestCustomer({ name: "Bloqueado", status: "blocked" });
      await createTestCustomer({ name: "Activo", status: "active" });

      const res = await request(app).get("/api/admin/customers").query({ status: "blocked" }).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({ name: "Bloqueado", status: "blocked" });
    });

    it("busca por q (name o email)", async () => {
      await createTestCustomer({ name: "María", email: "maria@example.com" });
      await createTestCustomer({ name: "Pedro", email: "pedro@example.com" });

      const byName = await request(app).get("/api/admin/customers").query({ q: "marí" }).set(adminHeaders);
      expect(byName.status).toBe(200);
      expect(byName.body.data.map((c: { name: string }) => c.name)).toEqual(["María"]);

      const byEmail = await request(app).get("/api/admin/customers").query({ q: "PEDRO" }).set(adminHeaders);
      expect(byEmail.status).toBe(200);
      expect(byEmail.body.data.map((c: { name: string }) => c.name)).toEqual(["Pedro"]);
    });

    it("ordena por createdAt ascendente", async () => {
      await createTestCustomer({ name: "Primero" });
      await createTestCustomer({ name: "Segundo" });

      const res = await request(app)
        .get("/api/admin/customers")
        .query({ sortBy: "createdAt", sortOrder: "asc" })
        .set(adminHeaders);

      expect(res.status).toBe(200);
      const names = res.body.data.map((c: { name: string }) => c.name);
      expect(names).toEqual(["Oliver Diaz", "Primero", "Segundo"]);
    });
  });

  describe("GET /api/admin/customers/stats", () => {
    it("responde 401 sin token y 403 para customer", async () => {
      const unauth = await request(app).get("/api/admin/customers/stats");
      expect(unauth.status).toBe(401);

      const forbidden = await request(app).get("/api/admin/customers/stats").set(customerHeaders);
      expect(forbidden.status).toBe(403);
    });

    it("agrega KPIs por estado (solo customers)", async () => {
      await createTestCustomer();
      await createTestCustomer({ status: "blocked" });
      await createTestCustomer({ status: "pending" });

      const res = await request(app).get("/api/admin/customers/stats").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        total: 4,
        active: 2,
        blocked: 1,
        pending: 1,
        newThisMonth: expect.any(Number),
      });
    });
  });

  describe("GET /api/admin/customers/:id", () => {
    it("responde 200 con el perfil de cliente", async () => {
      const target = await createTestCustomer({
        phone: "809-555-1234",
        address: { city: "Santiago" },
      });

      const res = await request(app).get(`/api/admin/customers/${target.id}`).set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: target.id,
        name: target.name,
        email: target.email,
        phone: "809-555-1234",
        status: "active",
        address: { city: "Santiago" },
      });
      expect(res.body.data).not.toHaveProperty("password");
    });

    it("responde 404 para un id inexistente", async () => {
      const res = await request(app).get("/api/admin/customers/64b000000000000000000099").set(adminHeaders);
      expect(res.status).toBe(404);
    });

    it("responde 404 si el documento pertenece a un admin (rol excluido)", async () => {
      const res = await request(app).get(`/api/admin/customers/${admin.id}`).set(adminHeaders);
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/admin/customers/:id", () => {
    it("responde 401/403 sin permisos", async () => {
      const target = await createTestCustomer();
      const unauth = await request(app).patch(`/api/admin/customers/${target.id}`).send({ name: "X" });
      expect(unauth.status).toBe(401);

      const forbidden = await request(app)
        .patch(`/api/admin/customers/${target.id}`)
        .set(customerHeaders)
        .send({ name: "X" });
      expect(forbidden.status).toBe(403);
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app)
        .patch("/api/admin/customers/64b000000000000000000099")
        .set(adminHeaders)
        .send({ name: "X" });
      expect(res.status).toBe(404);
    });

    it("actualiza name/email/phone/address y normaliza email", async () => {
      const target = await createTestCustomer();

      const res = await request(app)
        .patch(`/api/admin/customers/${target.id}`)
        .set(adminHeaders)
        .send({
          name: "Nuevo Nombre",
          email: "  NUEVO@EXAMPLE.COM  ",
          phone: "809-000-0000",
          address: { street: "Calle 1", city: "Santo Domingo" },
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: target.id,
        name: "Nuevo Nombre",
        email: "nuevo@example.com",
        phone: "809-000-0000",
        status: "active",
        address: { street: "Calle 1", city: "Santo Domingo" },
      });
    });

    it("no permite cambiar el status vía PATCH /:id", async () => {
      const target = await createTestCustomer();

      const res = await request(app)
        .patch(`/api/admin/customers/${target.id}`)
        .set(adminHeaders)
        .send({ status: "blocked" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("active");
    });

    it("responde 409 si el email pertenece a otro cliente", async () => {
      const target = await createTestCustomer();
      const other = await createTestCustomer();

      const res = await request(app)
        .patch(`/api/admin/customers/${target.id}`)
        .set(adminHeaders)
        .send({ email: other.email });

      expect(res.status).toBe(409);
    });
  });

  describe("PATCH /api/admin/customers/:id/status", () => {
    it("responde 400 si falta status", async () => {
      const target = await createTestCustomer();
      const res = await request(app)
        .patch(`/api/admin/customers/${target.id}/status`)
        .set(adminHeaders)
        .send({});
      expect(res.status).toBe(400);
    });

    it("responde 400 para un status inválido", async () => {
      const target = await createTestCustomer();
      const res = await request(app)
        .patch(`/api/admin/customers/${target.id}/status`)
        .set(adminHeaders)
        .send({ status: "bogus" });
      expect(res.status).toBe(400);
    });

    it("bloquea/desbloquea un cliente", async () => {
      const target = await createTestCustomer();

      const block = await request(app)
        .patch(`/api/admin/customers/${target.id}/status`)
        .set(adminHeaders)
        .send({ status: "blocked" });
      expect(block.status).toBe(200);
      expect(block.body.data.status).toBe("blocked");

      const unblock = await request(app)
        .patch(`/api/admin/customers/${target.id}/status`)
        .set(adminHeaders)
        .send({ status: "active" });
      expect(unblock.status).toBe(200);
      expect(unblock.body.data.status).toBe("active");
    });

    it("responde 404 si no existe", async () => {
      const res = await request(app)
        .patch("/api/admin/customers/64b000000000000000000099/status")
        .set(adminHeaders)
        .send({ status: "blocked" });
      expect(res.status).toBe(404);
    });
  });
});