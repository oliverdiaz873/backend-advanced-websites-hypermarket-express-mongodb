import * as orderRepository from "../repositories/order.repository";
import * as cartRepository from "../../cart/repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { ALLOWED_TRANSITIONS } from "../../../shared/constants/order-status";
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

export const create = async (userId: string) => {
  const cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }
  if (cart.items.length === 0) {
    throw new InvalidDataError("Cart is empty");
  }

  const items: OrderItem[] = [];
  const products = await productRepository.findByIds(cart.items.map((item) => item.productId));
  const productsById = new Map(products.map((product) => [product.id, product]));

  for (const item of cart.items) {
    const product = productsById.get(item.productId);
    if (!product) {
      throw new NotFoundError("Product not found");
    }
    items.push({
      productId: item.productId,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: item.quantity,
    });
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await orderRepository.create(userId, items, totalItems, subtotal);
  await cartRepository.clearCart(userId);

  return toResponse(order);
};

export const findByUser = async (userId: string) => {
  const orders = await orderRepository.findByUserId(userId);
  return orders.map(toResponse);
};

export const findById = async (userId: string, orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (order.userId !== userId) {
    throw new NotFoundError("Order not found");
  }
  return toResponse(order);
};

export const updateStatus = async (userId: string, orderId: string, newStatus: OrderStatus) => {
  const order = await orderRepository.findById(orderId);
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

  const updated = await orderRepository.updateStatus(orderId, newStatus);
  if (!updated) {
    throw new NotFoundError("Order not found");
  }
  return toResponse(updated);
};
