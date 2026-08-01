import * as statsService from "../../../src/modules/stats/services/stats.service";

jest.mock("../../../src/modules/stats/repositories/stats.repository", () =>
  require("../mocks/repositories").mockStatsRepository
);

import { mockStatsRepository } from "../mocks/repositories";

const setRepoValues = (overrides: Partial<Record<keyof typeof mockStatsRepository, unknown>> = {}) => {
  mockStatsRepository.countOrders.mockResolvedValue(10);
  mockStatsRepository.countOrdersByStatus.mockResolvedValue({ pending: 4, processing: 3, completed: 2, cancelled: 1 });
  mockStatsRepository.countCustomers.mockResolvedValue(5);
  mockStatsRepository.countProducts.mockResolvedValue(20);
  mockStatsRepository.countLowStock.mockResolvedValue(3);
  mockStatsRepository.countPendingContactMessages.mockResolvedValue(7);
  mockStatsRepository.sumRevenueSince.mockResolvedValue(1000);

  for (const [key, value] of Object.entries(overrides)) {
    (mockStatsRepository[key as keyof typeof mockStatsRepository] as jest.Mock).mockResolvedValue(value);
  }
};

describe("stats.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("compone el payload completo", async () => {
    setRepoValues();

    const result = await statsService.getOverview();

    expect(result).toEqual({
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
      revenue: { gross: { today: 1000, week: 1000, month: 1000 } },
    });
    expect(mockStatsRepository.sumRevenueSince).toHaveBeenCalledTimes(4);
  });

  it("normaliza las claves de ordersByStatus ausentes a 0", async () => {
    setRepoValues({ countOrdersByStatus: {} });

    const result = await statsService.getOverview();

    expect(result.ordersByStatus).toEqual({ pending: 0, processing: 0, completed: 0, cancelled: 0 });
    expect(result.summary.completedOrders).toBe(0);
    expect(result.summary.averageOrderValue).toBe(0);
  });

  it("calcula averageOrderValue redondeado a 2 decimales", async () => {
    setRepoValues({ countOrdersByStatus: { completed: 3 }, sumRevenueSince: 100 });

    const result = await statsService.getOverview();

    expect(result.summary.averageOrderValue).toBe(33.33);
  });

  it("evita división por cero y retorna ceros con la base vacía", async () => {
    setRepoValues({ countOrders: 0, countOrdersByStatus: {}, sumRevenueSince: 0 });

    const result = await statsService.getOverview();

    expect(result).toEqual({
      summary: {
        totalOrders: 0,
        grossRevenue: 0,
        averageOrderValue: 0,
        completedOrders: 0,
        totalCustomers: 5,
        totalProducts: 20,
        lowStockCount: 3,
        pendingContactMessages: 7,
      },
      ordersByStatus: { pending: 0, processing: 0, completed: 0, cancelled: 0 },
      revenue: { gross: { today: 0, week: 0, month: 0 } },
    });
  });

  it("consulta revenue desde hoy (UTC), 7 días, 30 días y el total histórico", async () => {
    setRepoValues();

    await statsService.getOverview();

    const calls = mockStatsRepository.sumRevenueSince.mock.calls.map((call) => call[0] as Date);
    expect(calls).toHaveLength(4);
    expect(calls.some((date) => date.getTime() === 0)).toBe(true);
    expect(
      calls.some((date) => date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0)
    ).toBe(true);

    const sorted = [...calls].sort((a, b) => b.getTime() - a.getTime());
    expect(sorted[1].getTime() - sorted[2].getTime()).toBe(23 * 24 * 60 * 60 * 1000);
  });
});
