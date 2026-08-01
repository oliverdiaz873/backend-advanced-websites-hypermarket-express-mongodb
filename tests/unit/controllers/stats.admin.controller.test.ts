import request from "supertest";
import statsRoutes from "../../../src/modules/stats/routes/stats.routes";
import { createTestApp, createAuthToken } from "../helpers/test-app";

jest.mock("../../../src/modules/stats/services/stats.service", () =>
  require("../mocks/repositories").mockStatsService
);

import { mockStatsService } from "../mocks/repositories";

const app = createTestApp("/api/admin/stats", statsRoutes);
const customerToken = createAuthToken({ id: "64b000000000000000000001", email: "oliver@example.com", role: "customer" });
const adminToken = createAuthToken({ id: "64b000000000000000000002", email: "admin@example.com", role: "admin" });

const overview = {
  summary: {
    totalOrders: 10,
    grossRevenue: 1000,
    averageOrderValue: 500,
    completedOrders: 2,
    totalCustomers: 5,
    totalProducts: 20,
    lowStockCount: 3,
    pendingContactMessages: 7,
  },
  ordersByStatus: { pending: 4, processing: 3, completed: 2, cancelled: 1 },
  revenue: { gross: { today: 100, week: 700, month: 1000 } },
};

describe("stats.admin.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/admin/stats");

    expect(res.status).toBe(401);
  });

  it("responde 403 si no es admin", async () => {
    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(mockStatsService.getOverview).not.toHaveBeenCalled();
  });

  it("responde 200 con el overview (admin)", async () => {
    mockStatsService.getOverview.mockResolvedValue(overview);

    const res = await request(app).get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`);

    expect(mockStatsService.getOverview).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: overview });
  });
});
