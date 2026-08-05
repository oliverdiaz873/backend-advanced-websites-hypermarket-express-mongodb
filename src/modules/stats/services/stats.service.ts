import * as statsRepository from "../repositories/stats.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type {
  CategorySalesStat,
  DashboardKpis,
  InventorySummary,
  OrderStatus,
  RevenueTrendPoint,
  StatsFilter,
  StatsOrdersByStatus,
  StatsOverview,
  StatsQuery,
  TopProductStat,
} from "../../../types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 5;

const startOfTodayUtc = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

const parseIntRange = (raw: unknown, max: number, label: string): number => {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new InvalidDataError(`${label} must be an integer between 1 and ${max}`);
  }
  return value;
};

const parseIso = (raw: unknown, label: string): Date => {
  if (typeof raw !== "string") {
    throw new InvalidDataError(`${label} must be a valid ISO date string`);
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new InvalidDataError(`${label} must be a valid ISO date string`);
  }
  return date;
};

const normalizeByStatus = (counts: Record<string, number>): StatsOrdersByStatus =>
  ORDER_STATUSES.reduce<StatsOrdersByStatus>(
    (acc, status) => {
      acc[status] = counts[status] ?? 0;
      return acc;
    },
    { pending: 0, confirmed: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 }
  );

/** Parser común del contrato `query` compartido por todos los endpoints. */
export const parseStatsQuery = (raw: Record<string, unknown>): StatsQuery => {
  const days = raw.days !== undefined ? parseIntRange(raw.days, 3650, "days") : undefined;
  const limit = raw.limit !== undefined ? parseIntRange(raw.limit, 50, "limit") : undefined;

  let from: string | undefined;
  let to: string | undefined;
  if (raw.from !== undefined) {
    from = parseIso(raw.from, "from").toISOString();
  }
  if (raw.to !== undefined) {
    to = parseIso(raw.to, "to").toISOString();
  }
  if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
    throw new InvalidDataError("from must be before or equal to to");
  }

  return {
    days,
    from,
    to,
    categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
    productId: typeof raw.productId === "string" ? raw.productId : undefined,
    storeId: typeof raw.storeId === "string" ? raw.storeId : undefined,
    limit,
  };
};

/**
 * Resuelve el rango de fechas y los ids de producto a partir del query.
 * - from/to tienen prioridad sobre days.
 * - to se interpreta como inclusivo de su día (exclusivo internamente).
 * - categoryId se traduce al conjunto de sus productos.
 */
const buildFilter = async (query: StatsQuery, now: Date): Promise<StatsFilter> => {
  let from: Date | undefined;
  let to: Date | undefined;

  if (query.from) {
    from = new Date(query.from);
  }
  if (query.to) {
    to = new Date(new Date(query.to).getTime() + DAY_MS);
  }
  if (!from) {
    const days = query.days ?? DEFAULT_DAYS;
    from = new Date(now.getTime() - days * DAY_MS);
  }

  let productIds: string[] | undefined;
  if (query.productId !== undefined) {
    productIds = [query.productId];
  } else if (query.categoryId !== undefined) {
    productIds = await statsRepository.findProductIdsByCategory(query.categoryId);
  }

  return { from, to, productIds };
};

export const getOverview = async (): Promise<StatsOverview> => {
  const now = new Date();

  const [totalOrders, ordersByStatus, totalCustomers, totalProducts, lowStockCount, pendingContactMessages, today, week, month, grossRevenue] =
    await Promise.all([
      statsRepository.countOrders(),
      statsRepository.countOrdersByStatus(),
      statsRepository.countCustomers(),
      statsRepository.countProducts(),
      statsRepository.countLowStock(),
      statsRepository.countPendingContactMessages(),
      statsRepository.sumRevenueSince(startOfTodayUtc(now)),
      statsRepository.sumRevenueSince(new Date(now.getTime() - 7 * DAY_MS)),
      statsRepository.sumRevenueSince(new Date(now.getTime() - 30 * DAY_MS)),
      statsRepository.sumRevenueSince(new Date(0)),
    ]);

  const normalizedByStatus = normalizeByStatus(ordersByStatus);

  const completedOrders = normalizedByStatus.completed;
  const averageOrderValue = completedOrders === 0 ? 0 : roundToCents(grossRevenue / completedOrders);

  return {
    summary: {
      totalOrders,
      grossRevenue,
      averageOrderValue,
      completedOrders,
      totalCustomers,
      totalProducts,
      lowStockCount,
      pendingContactMessages,
    },
    ordersByStatus: normalizedByStatus,
    revenue: {
      gross: {
        today,
        week,
        month,
      },
    },
  };
};

export const getDashboard = async (query: StatsQuery): Promise<DashboardKpis> => {
  const now = new Date();
  const filter = await buildFilter(query, now);
  const windowLengthMs =
    filter.to !== undefined
      ? filter.to.getTime() - (filter.from?.getTime() ?? 0)
      : (query.days ?? DEFAULT_DAYS) * DAY_MS;
  const previousFrom = new Date((filter.from?.getTime() ?? now.getTime()) - windowLengthMs);

  const [
    periodRevenue,
    previousRevenue,
    orders,
    periodOrdersByStatus,
    totalCustomers,
    newCustomers,
    lowStock,
    pendingContactMessages,
  ] = await Promise.all([
    statsRepository.sumRevenue(filter),
    statsRepository.sumRevenue({ ...filter, from: previousFrom, to: filter.from }),
    statsRepository.countOrdersSince(filter),
    statsRepository.countOrdersByStatus(filter),
    statsRepository.countCustomers(),
    statsRepository.countNewCustomersSince(filter.from!),
    statsRepository.countLowStock(),
    statsRepository.countPendingContactMessages(),
  ]);

  const completedOrders = periodOrdersByStatus.completed ?? 0;
  const growthPercent =
    previousRevenue === 0
      ? periodRevenue > 0
        ? 100
        : 0
      : roundToCents(((periodRevenue - previousRevenue) / previousRevenue) * 100);

  return {
    revenue: roundToCents(periodRevenue),
    averageOrderValue: completedOrders === 0 ? 0 : roundToCents(periodRevenue / completedOrders),
    orders,
    completedOrders,
    pendingOrders: periodOrdersByStatus.pending ?? 0,
    customers: totalCustomers,
    newCustomers,
    lowStock,
    pendingContactMessages,
    growthPercent,
  };
};

export const getRevenueSeries = async (query: StatsQuery): Promise<RevenueTrendPoint[]> => {
  const filter = await buildFilter(query, new Date());
  return statsRepository.sumRevenueByDay(filter);
};

export const getOrdersByStatus = async (query: StatsQuery): Promise<StatsOrdersByStatus> => {
  const filter = await buildFilter(query, new Date());
  return normalizeByStatus(await statsRepository.countOrdersByStatus(filter));
};

export const getTopProducts = async (query: StatsQuery): Promise<TopProductStat[]> => {
  const filter = await buildFilter(query, new Date());
  const limit = query.limit ?? DEFAULT_LIMIT;
  return statsRepository.topProductsByQuantity(limit, filter);
};

export const getCategorySales = async (query: StatsQuery): Promise<CategorySalesStat[]> => {
  const filter = await buildFilter(query, new Date());
  return statsRepository.sumRevenueByCategory(filter);
};

export const getInventorySummary = async (_query: StatsQuery): Promise<InventorySummary> =>
  statsRepository.inventorySummary();