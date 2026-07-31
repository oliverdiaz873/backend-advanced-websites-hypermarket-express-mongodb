import * as orderRepository from "../repositories/order.repository";
import * as cartRepository from "../../cart/repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { ORDER_STATUS, ALLOWED_TRANSITIONS } from "../../../shared/constants/order-status";
import type { Order, OrderItem, OrderStatus } from "../../../types";

const toResponse = (order: Order) => ({
  id: order.id,
  items: order.items,
  totalItems: order.totalItems,
  subtotal: order.subtotal,
  status: order.status,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

export const create = (userId: string) => {
  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }
  if (cart.items.length === 0) {
    throw new InvalidDataError("Cart is empty");
  }

  const items: OrderItem[] = cart.items.map((item) => {
    const product = productRepository.findById(item.productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    return {
      productId: item.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: item.quantity,
    };
  });

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = orderRepository.create(userId, items, totalItems, subtotal);
  cartRepository.clearCart(userId);

  return toResponse(order);
};

export const findByUser = (userId: string) => {
  const orders = orderRepository.findByUserId(userId);
  return orders.map(toResponse);
};

export const findById = (userId: string, orderId: string) => {
  const order = orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }
  return toResponse(order);
};

export const updateStatus = (userId: string, orderId: string, newStatus: OrderStatus) => {
  const order = orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] as readonly OrderStatus[] | undefined;
  if (!allowed || !allowed.includes(newStatus)) {
    throw new InvalidDataError(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  const updated = orderRepository.updateStatus(orderId, newStatus);
  return toResponse(updated!);
};
