import { OrderModel } from "../models/order.model";
import { isValidObjectId, toObjectId } from "../../../shared/utils/mongo";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../../shared/constants/order-status";
import { ORDER_SORT_FIELDS, type OrderSortField } from "../constants/order-sort-fields";
import type {
  Order,
  OrderItem,
  OrderPageResult,
  OrderStatus,
  PaymentStatus,
  SortDirection,
} from "../../../types";

export interface OrderFindPageInput {
  page: number;
  limit: number;
  status?: OrderStatus;
  userIds?: string[];
  orderId?: string;
  sortBy?: OrderSortField;
  sortOrder?: SortDirection;
}

export interface OrderStatusHistoryInput {
  status: OrderStatus;
  changedAt: Date;
  by?: string;
  note?: string;
}

const buildSort = (
  sortBy: OrderSortField | undefined,
  sortOrder: SortDirection
): Record<string, 1 | -1> => {
  if (!sortBy || !ORDER_SORT_FIELDS.includes(sortBy)) {
    return { createdAt: -1 };
  }
  const direction: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  return { [sortBy]: direction };
};

export const findAll = async (): Promise<Order[]> => {
  const docs = await OrderModel.find().sort({ createdAt: -1 });
  return docs.map((doc) => doc.toJSON() as unknown as Order);
};

export const findPage = async (query: OrderFindPageInput): Promise<OrderPageResult> => {
  const { page, limit, status, userIds, orderId, sortBy, sortOrder } = query;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const orConditions: Record<string, unknown>[] = [];
  if (userIds && userIds.length > 0) {
    const validIds = userIds.filter(isValidObjectId);
    if (validIds.length > 0) orConditions.push({ userId: { $in: validIds } });
  }
  if (orderId && isValidObjectId(orderId)) {
    orConditions.push({ _id: orderId });
  }
  if (orConditions.length > 0) filter.$or = orConditions;

  const skip = (page - 1) * limit;
  const sort = buildSort(sortBy, sortOrder ?? "desc");

  const [docs, total] = await Promise.all([
    OrderModel.find(filter).sort(sort).skip(skip).limit(limit),
    OrderModel.countDocuments(filter),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as Order);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const findByUserId = async (userId: string): Promise<Order[]> => {
  if (!isValidObjectId(userId)) return [];
  const docs = await OrderModel.find({ userId: toObjectId(userId) }).sort({ createdAt: -1 });
  return docs.map((doc) => doc.toJSON() as unknown as Order);
};

export const findByUserAndIdempotencyKey = async (
  userId: string,
  idempotencyKey: string
): Promise<Order | null> => {
  if (!isValidObjectId(userId) || !idempotencyKey) return null;
  const doc = await OrderModel.findOne({ userId: toObjectId(userId), idempotencyKey });
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const findById = async (orderId: string): Promise<Order | null> => {
  if (!isValidObjectId(orderId)) return null;
  const doc = await OrderModel.findById(orderId);
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const create = async (
  userId: string,
  items: OrderItem[],
  totalItems: number,
  subtotal: number,
  shippingAddress?: Order["shippingAddress"],
  createdBy?: string,
  idempotencyKey?: string,
  orderNumber?: string
): Promise<Order> => {
  const doc = await OrderModel.create({
    userId: toObjectId(userId),
    idempotencyKey,
    orderNumber,
    items,
    shippingAddress,
    totalItems,
    subtotal,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    statusHistory: [{ status: ORDER_STATUS.PENDING, changedAt: new Date(), by: createdBy }],
  });
  return doc.toJSON() as unknown as Order;
};

export const updateStatus = async (
  orderId: string,
  expectedStatus: OrderStatus,
  status: OrderStatus,
  historyEntry: OrderStatusHistoryInput
): Promise<Order | null> => {
  if (!isValidObjectId(orderId)) return null;
  const doc = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: expectedStatus },
    { status, $push: { statusHistory: historyEntry } },
    { returnDocument: "after" }
  );
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const updatePaymentStatus = async (
  orderId: string,
  expectedPaymentStatus: PaymentStatus,
  paymentStatus: PaymentStatus
): Promise<Order | null> => {
  if (!isValidObjectId(orderId)) return null;
  const doc = await OrderModel.findOneAndUpdate(
    { _id: orderId, paymentStatus: expectedPaymentStatus },
    { paymentStatus },
    { returnDocument: "after" }
  );
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const findByOrderNumber = async (orderNumber: string): Promise<Order | null> => {
  if (!orderNumber) return null;
  const doc = await OrderModel.findOne({ orderNumber });
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const deleteById = async (orderId: string): Promise<boolean> => {
  if (!isValidObjectId(orderId)) return false;
  const doc = await OrderModel.findByIdAndDelete(orderId);
  return doc !== null;
};
