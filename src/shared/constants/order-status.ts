import type { OrderStatus, UserRole } from "../../types";

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const CUSTOMER_ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export const ADMIN_ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

export const canTransitionOrderStatus = (
  current: OrderStatus,
  next: OrderStatus,
  role: UserRole
): boolean => {
  const allowed = role === "admin" ? ADMIN_ALLOWED_TRANSITIONS[current] : CUSTOMER_ALLOWED_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
};

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
} as const;
