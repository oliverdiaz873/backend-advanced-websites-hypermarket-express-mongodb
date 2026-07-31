import { randomUUID } from "crypto";
import orders from "../data/orders.data";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../../shared/constants/order-status";
import type { Order, OrderItem, OrderStatus } from "../../../types";

export const findByUserId = (userId: string): Order[] => {
  return orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const findById = (orderId: string): Order | null => {
  return orders.find((o) => o.id === orderId) || null;
};

export const create = (userId: string, items: OrderItem[], totalItems: number, subtotal: number): Order => {
  const now = new Date();
  const order: Order = {
    id: randomUUID(),
    userId,
    items,
    totalItems,
    subtotal,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    createdAt: now,
    updatedAt: now,
  };
  orders.push(order);
  return order;
};

export const updateStatus = (orderId: string, status: OrderStatus): Order | null => {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  order.status = status;
  order.updatedAt = new Date();
  return order;
};
