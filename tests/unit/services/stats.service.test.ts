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
      ordersByStatus: { pending: 4, confirmed: 0, processing: 3, shipped: 0, completed: 2, cancelled: 1 },
      revenue: { gross: { today: 1000, week: 1000, month: 1000 } },
    });
    expect(mockStatsRepository.sumRevenueSince).toHaveBeenCalledTimes(4);
  });

  it("normaliza las claves de ordersByStatus ausentes a 0", async () => {
    setRepoValues({ countOrdersByStatus: {} });

    const result = await statsService.getOverview();

    expect(result.ordersByStatus).toEqual({
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    });
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
      ordersByStatus: {
        pending: 0,
        confirmed: 0,
        processing: 0,
        shipped: 0,
        completed: 0,
        cancelled: 0,
      },
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

  it("getDashboard compone los KPIs del período de 30 días", async () => {
    jest.clearAllMocks();
    mockStatsRepository.sumRevenue.mockResolvedValueOnce(1000).mockResolvedValueOnce(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(10);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({ pending: 2, completed: 5, cancelled: 3 });
    mockStatsRepository.countCustomers.mockResolvedValue(20);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(4);
    mockStatsRepository.countLowStock.mockResolvedValue(3);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(7);

    const result = await statsService.getDashboard({ days: 30 });

    expect(result).toEqual({
      revenue: 1000,
      averageOrderValue: 200,
      orders: 10,
      completedOrders: 5,
      pendingOrders: 2,
      customers: 20,
      newCustomers: 4,
      lowStock: 3,
      pendingContactMessages: 7,
      growthPercent: 100,
    });
    expect(mockStatsRepository.sumRevenue).toHaveBeenCalledTimes(2);
  });

  it("getDashboard evita división por cero y growth de 100 si había base vacía", async () => {
    jest.clearAllMocks();
    mockStatsRepository.sumRevenue.mockResolvedValue(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(0);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({});
    mockStatsRepository.countCustomers.mockResolvedValue(0);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    const result = await statsService.getDashboard({});

    expect(result.averageOrderValue).toBe(0);
    expect(result.growthPercent).toBe(0);
  });

  it("getDashboard calcula crecimiento período vs ventana anterior de igual longitud", async () => {
    mockStatsRepository.sumRevenue.mockReturnValueOnce(1500).mockReturnValueOnce(1000);
    mockStatsRepository.countOrdersSince.mockResolvedValue(1);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({ completed: 1 });
    mockStatsRepository.countCustomers.mockResolvedValue(1);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    const result = await statsService.getDashboard({ days: 30 });

    expect(result.growthPercent).toBe(50);
  });

  it("getDashboard respeta el rango activo (days → nueva fecha de inicio)", async () => {
    mockStatsRepository.sumRevenue.mockResolvedValue(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(0);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({});
    mockStatsRepository.countCustomers.mockResolvedValue(0);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    await statsService.getDashboard({ days: 7 });

    const firstCall = mockStatsRepository.sumRevenue.mock.calls[0][0];
    expect(firstCall.from).toBeInstanceOf(Date);
    expect(Date.now() - firstCall.from.getTime()).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(Date.now() - firstCall.from.getTime()).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 1000);
  });

  it("getDashboard resuelve categoryId a productIds y los aplica a las consultas", async () => {
    mockStatsRepository.findProductIdsByCategory.mockResolvedValue(["p1", "p2"]);
    mockStatsRepository.sumRevenue.mockResolvedValue(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(0);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({});
    mockStatsRepository.countCustomers.mockResolvedValue(0);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    await statsService.getDashboard({ categoryId: "cat_x" });

    expect(mockStatsRepository.findProductIdsByCategory).toHaveBeenCalledWith("cat_x");
    expect(mockStatsRepository.sumRevenue).toHaveBeenCalledWith(
      expect.objectContaining({ productIds: ["p1", "p2"] })
    );
  });

  it("getDashboard filtra por productId sin resolver categoría", async () => {
    mockStatsRepository.sumRevenue.mockResolvedValue(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(0);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({});
    mockStatsRepository.countCustomers.mockResolvedValue(0);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    await statsService.getDashboard({ productId: "p_x" });

    expect(mockStatsRepository.findProductIdsByCategory).not.toHaveBeenCalled();
    expect(mockStatsRepository.sumRevenue).toHaveBeenCalledWith(
      expect.objectContaining({ productIds: ["p_x"] })
    );
  });

  it("from tiene prioridad sobre days para fijar el inicio del período", async () => {
    mockStatsRepository.sumRevenue.mockResolvedValue(0);
    mockStatsRepository.countOrdersSince.mockResolvedValue(0);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({});
    mockStatsRepository.countCustomers.mockResolvedValue(0);
    mockStatsRepository.countNewCustomersSince.mockResolvedValue(0);
    mockStatsRepository.countLowStock.mockResolvedValue(0);
    mockStatsRepository.countPendingContactMessages.mockResolvedValue(0);

    await statsService.getDashboard({ days: 90, from: "2026-01-01" });

    const firstCall = mockStatsRepository.sumRevenue.mock.calls[0][0];
    expect(firstCall.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("delega los gráficos y summary al repository con el filtro resuelto", async () => {
    mockStatsRepository.sumRevenueByDay.mockResolvedValue([{ date: "x", total: 1 }]);
    mockStatsRepository.countOrdersByStatus.mockResolvedValue({ completed: 1 });
    mockStatsRepository.topProductsByQuantity.mockResolvedValue([]);
    mockStatsRepository.sumRevenueByCategory.mockResolvedValue([]);
    mockStatsRepository.inventorySummary.mockResolvedValue({ inventoryValue: 0, totalUnits: 0, totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 });

    const filterShape = expect.objectContaining({ from: expect.any(Date), productIds: undefined });

    await statsService.getRevenueSeries({});
    await statsService.getOrdersByStatus({});
    await statsService.getOrdersByStatus({ days: 30 });
    await statsService.getTopProducts({});
    await statsService.getCategorySales({ days: 90 });
    await statsService.getInventorySummary({});

    expect(mockStatsRepository.sumRevenueByDay).toHaveBeenCalledWith(filterShape);
    expect(mockStatsRepository.countOrdersByStatus).toHaveBeenNthCalledWith(1, filterShape);
    expect(mockStatsRepository.countOrdersByStatus).toHaveBeenNthCalledWith(2, filterShape);
    expect(mockStatsRepository.topProductsByQuantity).toHaveBeenCalledWith(5, filterShape);
    expect(mockStatsRepository.sumRevenueByCategory).toHaveBeenCalledWith(filterShape);
    expect(mockStatsRepository.inventorySummary).toHaveBeenCalledTimes(1);
  });

  it("parseStatsQuery mapea el contrato común", () => {
    const parsed = statsService.parseStatsQuery({
      days: "30",
      from: "2026-01-01",
      to: "2026-02-01",
      categoryId: "cat_x",
      productId: "p_x",
      storeId: "s_x",
      limit: "10",
    });

    expect(parsed).toEqual({
      days: 30,
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-02-01T00:00:00.000Z",
      categoryId: "cat_x",
      productId: "p_x",
      storeId: "s_x",
      limit: 10,
    });
  });

  it("parseStatsQuery maneja valores ausentes", () => {
    const parsed = statsService.parseStatsQuery({});

    expect(parsed.days).toBeUndefined();
    expect(parsed.limit).toBeUndefined();
  });

  it("rechaza days no entero o fuera del rango válido", () => {
    expect(() => statsService.parseStatsQuery({ days: "abc" })).toThrow("days");
    expect(() => statsService.parseStatsQuery({ days: "0" })).toThrow("days");
    expect(() => statsService.parseStatsQuery({ days: "-5" })).toThrow("days");
    expect(() => statsService.parseStatsQuery({ days: "30.5" })).toThrow("days");
    expect(() => statsService.parseStatsQuery({ days: "3651" })).toThrow("days");
  });

  it("rechaza limit no entero o fuera del rango válido", () => {
    expect(() => statsService.parseStatsQuery({ limit: "0" })).toThrow("limit");
    expect(() => statsService.parseStatsQuery({ limit: "51" })).toThrow("limit");
    expect(() => statsService.parseStatsQuery({ limit: "abc" })).toThrow("limit");
  });

  it("rechaza fechas inválidas y from posterior a to", () => {
    expect(() => statsService.parseStatsQuery({ from: "nope" })).toThrow("from");
    expect(() => statsService.parseStatsQuery({ to: "nope" })).toThrow("to");
    expect(() => statsService.parseStatsQuery({ from: "2026-02-01", to: "2026-01-01" })).toThrow("from");
  });
});