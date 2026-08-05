import * as statsRepository from "../../../src/modules/stats/repositories/stats.repository";

jest.mock("../../../src/modules/orders/models/order.model", () => ({
  OrderModel: { aggregate: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../../../src/modules/products/models/product.model", () => ({
  ProductModel: { find: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../../../src/modules/inventory/models/inventory.model", () => ({
  InventoryModel: { aggregate: jest.fn(), countDocuments: jest.fn() },
}));
jest.mock("../../../src/modules/contact/models/contact-message.model", () => ({
  ContactMessageModel: { countDocuments: jest.fn() },
}));
jest.mock("../../../src/modules/users/models/user.model", () => ({
  UserModel: { countDocuments: jest.fn() },
}));

import { OrderModel } from "../../../src/modules/orders/models/order.model";
import { ProductModel } from "../../../src/modules/products/models/product.model";
import { InventoryModel } from "../../../src/modules/inventory/models/inventory.model";
import type { StatsFilter } from "../../../src/types";

const aggregate = OrderModel.aggregate as jest.Mock;
const countDocuments = OrderModel.countDocuments as jest.Mock;

const filter: StatsFilter = {
  from: new Date("2026-01-01T00:00:00.000Z"),
  to: new Date("2026-02-01T00:00:00.000Z"),
  productIds: ["p1", "p2"],
};

const firstMatch = (): Record<string, unknown> => aggregate.mock.calls[0][0][0].$match;

describe("stats.repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("findProductIdsByCategory resuelve categoría a ids de producto", async () => {
    const select = jest.fn().mockReturnThis();
    const lean = jest.fn().mockResolvedValue([{ _id: "p1" }, { _id: "p2" }]);
    (ProductModel.find as jest.Mock).mockReturnValue({ select, lean });

    const ids = await statsRepository.findProductIdsByCategory("cat_x");

    expect(ProductModel.find).toHaveBeenCalledWith({ categoryId: "cat_x" });
    expect(select).toHaveBeenCalledWith("_id");
    expect(ids).toEqual(["p1", "p2"]);
  });

  it("countOrdersByStatus normaliza y aplica el filtro de fechas e ítems", async () => {
    aggregate.mockResolvedValue([{ _id: "pending", count: 3 }, { _id: "completed", count: 2 }]);

    const result = await statsRepository.countOrdersByStatus(filter);

    expect(result).toEqual({ pending: 3, completed: 2 });
    expect(firstMatch().createdAt).toEqual({ $gte: filter.from, $lt: filter.to });
    expect(firstMatch().items).toEqual({ $elemMatch: { productId: { $in: ["p1", "p2"] } } });
  });

  it("countOrdersByStatus sin filtro agrega todas las órdenes", async () => {
    aggregate.mockResolvedValue([{ _id: "cancelled", count: 1 }]);

    await statsRepository.countOrdersByStatus();

    expect(firstMatch()).toEqual({});
  });

  it("countOrdersSince cuenta todos los estados dentro del filtro", async () => {
    countDocuments.mockResolvedValue(7);

    const result = await statsRepository.countOrdersSince(filter);

    expect(result).toBe(7);
    expect(countDocuments).toHaveBeenCalledWith({
      createdAt: { $gte: filter.from, $lt: filter.to },
      items: { $elemMatch: { productId: { $in: ["p1", "p2"] } } },
    });
  });

  it("sumRevenue retorna 0 cuando no hay filas y usa status completed", async () => {
    aggregate.mockResolvedValue([]);

    const result = await statsRepository.sumRevenue(filter);

    expect(result).toBe(0);
    const match = firstMatch();
    expect(match.status).toBe("completed");
    expect(match.createdAt).toEqual({ $gte: filter.from, $lt: filter.to });
  });

  it("sumRevenue suma subtotal de las filas encontradas", async () => {
    aggregate.mockResolvedValue([{ _id: null, total: 500 }]);

    const result = await statsRepository.sumRevenue(filter);

    expect(result).toBe(500);
  });

  it("sumRevenueSince envuelve a sumRevenue con un from abierto", async () => {
    aggregate.mockResolvedValue([{ _id: null, total: 100 }]);
    const date = new Date("2026-01-15T00:00:00.000Z");

    const result = await statsRepository.sumRevenueSince(date);

    expect(result).toBe(100);
    expect(firstMatch().createdAt).toEqual({ $gte: date });
  });

  it("sumRevenueByDay agrupa por fecha y mapea date/total", async () => {
    aggregate.mockResolvedValue([
      { _id: { date: "2026-01-10" }, total: 100 },
      { _id: { date: "2026-01-11" }, total: 250 },
    ]);

    const result = await statsRepository.sumRevenueByDay(filter);

    expect(result).toEqual([
      { date: "2026-01-10", total: 100 },
      { date: "2026-01-11", total: 250 },
    ]);
  });

  it("topProductsByQuantity aplica limit y filtra items por producto", async () => {
    aggregate.mockResolvedValue([{ productId: "p1", name: "Arroz", quantity: 5, revenue: 500 }]);

    const result = await statsRepository.topProductsByQuantity(1, filter);

    expect(result[0]).toMatchObject({ productId: "p1", quantity: 5, revenue: 500 });
    const stages = aggregate.mock.calls[0][0] as Array<{ $limit?: number }>;
    expect(stages.some((s) => s.$limit === 1)).toBe(true);
    expect(firstMatch().items).toEqual({ $elemMatch: { productId: { $in: ["p1", "p2"] } } });
  });

  it("sumRevenueByCategory agrupa por categoría tras el lookup de productos", async () => {
    aggregate.mockResolvedValue([
      { _id: "granos", category: "Granos", slug: "granos", revenue: 200, orders: 1 },
    ]);

    const result = await statsRepository.sumRevenueByCategory(filter);

    expect(result[0]).toMatchObject({ category: "Granos", slug: "granos", revenue: 200, orders: 1 });
    const stages = aggregate.mock.calls[0][0] as Array<{ $lookup?: { from: string } }>;
    expect(stages.some((s) => s.$lookup?.from === "products")).toBe(true);
  });

  it("sumRevenue con productIds vacío no matchea ningún ítem (resultado vacío)", async () => {
    aggregate.mockResolvedValue([]);

    const result = await statsRepository.sumRevenue({ from: filter.from, productIds: [] });

    const match = firstMatch();
    expect(match.items).toEqual({ $elemMatch: { productId: { $in: [] } } });
    expect(result).toBe(0);
  });

  it("inventorySummary agrupa por producto y combina las métricas de stock", async () => {
    (InventoryModel.aggregate as jest.Mock).mockResolvedValue([{ value: 1100, totalUnits: 12 }]);
    (InventoryModel.countDocuments as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);
    (ProductModel.countDocuments as jest.Mock).mockResolvedValue(2);

    const result = await statsRepository.inventorySummary();

    expect(result).toMatchObject({
      inventoryValue: 1100,
      totalUnits: 12,
      totalProducts: 2,
      lowStockCount: 1,
      outOfStockCount: 0,
    });
    expect(InventoryModel.countDocuments).toHaveBeenCalledTimes(2);
  });
});