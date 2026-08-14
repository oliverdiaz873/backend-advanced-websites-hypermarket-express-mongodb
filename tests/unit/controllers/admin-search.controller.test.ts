import request from "supertest";
import adminSearchRoutes from "../../../src/modules/admin-search/routes/admin-search.routes";
import { createTestApp, createAuthToken } from "../helpers/test-app";

jest.mock("../../../src/modules/admin-search/services/admin-search.service", () =>
  require("../mocks/repositories").mockAdminSearchService
);

import { mockAdminSearchService } from "../mocks/repositories";

const app = createTestApp("/api/admin/search", adminSearchRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

describe("admin-search.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/admin/search");

    expect(res.status).toBe(401);
  });

  it("responde 403 si no es admin", async () => {
    const res = await request(app).get("/api/admin/search").set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(mockAdminSearchService.search).not.toHaveBeenCalled();
  });

  it("responde 200 con { success, data } y pasa q/limit al service", async () => {
    const data = { products: [], orders: [], customers: [] };
    mockAdminSearchService.search.mockResolvedValue(data);

    const res = await request(app).get("/api/admin/search").query({ q: "arroz", limit: "3" }).set("Authorization", `Bearer ${adminToken}`);

    expect(mockAdminSearchService.search).toHaveBeenCalledWith({ q: "arroz", limit: 3 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data });
  });

  it("omite q y limit si no vienen en la query", async () => {
    mockAdminSearchService.search.mockResolvedValue({ products: [], orders: [], customers: [] });

    const res = await request(app).get("/api/admin/search").set("Authorization", `Bearer ${adminToken}`);

    expect(mockAdminSearchService.search).toHaveBeenCalledWith({ q: undefined, limit: undefined });
    expect(res.status).toBe(200);
  });

  it("propaga errores del service", async () => {
    mockAdminSearchService.search.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/admin/search").query({ q: "arroz" }).set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(500);
  });
});