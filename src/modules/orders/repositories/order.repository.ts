import { OrderModel } from "../models/order.model";
import { isValidObjectId, toObjectId } from "../../../shared/utils/mongo";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../../shared/constants/order-status";
import type { Order, OrderItem, OrderStatus } from "../../../types";

export const findByUserId = async (userId: string): Promise<Order[]> => {
  if (!isValidObjectId(userId)) return [];
  const docs = await OrderModel.find({ userId: toObjectId(userId) }).sort({ createdAt: -1 });
  return docs.map((doc) => doc.toJSON() as unknown as Order);
};

export const findById = async (orderId: string): Promise<Order | null> => {
  if (!isValidObjectId(orderId)) return null;
  const doc = await OrderModel.findById(orderId);
  return doc ? (doc.toJSON() as unknown as Order) : null;
};

export const create = async (userId: string, items: OrderItem[], totalItems: number, subtotal: number): Promise<Order> => {
  const doc = await OrderModel.create({
    userId: toObjectId(userId),
    items,
    totalItems,
    subtotal,
    status: ORDER_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
  });
  return doc.toJSON() as unknown as Order;
};

export const updateStatus = async (orderId: string, status: OrderStatus): Promise<Order | null> => {
  if (!isValidObjectId(orderId)) return null;
  const doc = await OrderModel.findByIdAndUpdate(orderId, { status }, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Order) : null;
};
