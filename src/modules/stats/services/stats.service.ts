import * as statsRepository from "../repositories/stats.repository";
import type { OrderStatus, StatsOverview } from "../../../types";

const ORDER_STATUSES: OrderStatus[] = ["pending", "processing", "completed", "cancelled"];

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfTodayUtc = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

const roundToCents = (value: number): number => Math.round(value * 100) / 100;

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

  const normalizedByStatus = ORDER_STATUSES.reduce<Record<OrderStatus, number>>((acc, status) => {
    acc[status] = ordersByStatus[status] ?? 0;
    return acc;
  }, {} as Record<OrderStatus, number>);

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
    ordersByStatus: {
      pending: normalizedByStatus.pending,
      processing: normalizedByStatus.processing,
      completed: normalizedByStatus.completed,
      cancelled: normalizedByStatus.cancelled,
    },
    revenue: {
      gross: {
        today,
        week,
        month,
      },
    },
  };
};
