import * as orderRepository from "../repositories/order.repository";
import * as cartRepository from "../../cart/repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as addressRepository from "../../addresses/repositories/address.repository";
import * as inventoryService from "../../inventory/services/inventory.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../shared/errors/insufficient-stock.error";
import { canTransitionOrderStatus } from "../../../shared/constants/order-status";
import type { Order, OrderItem, OrderStatus } from "../../../types";

const toResponse = (order: Order) => ({
  id: order.id,
  items: order.items,
  shippingAddress: order.shippingAddress,
  totalItems: order.totalItems,
  subtotal: order.subtotal,
  status: order.status,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const applyStatusTransition = async (order: Order, newStatus: OrderStatus): Promise<ReturnType<typeof toResponse>> => {
  const updated = await orderRepository.updateStatus(order.id, order.status, newStatus);
  if (!updated) {
    const current = await orderRepository.findById(order.id);
    if (!current) {
      throw new NotFoundError("Order not found");
    }
    return toResponse(current);
  }

  if (newStatus === "cancelled") {
    for (const item of updated.items) {
      await inventoryService.restoreStock(item.productId, item.quantity);
    }
  }

  return toResponse(updated);
};

export const create = async (userId: string, addressId: string) => {
  const cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }
  if (cart.items.length === 0) {
    throw new InvalidDataError("Cart is empty");
  }

  const address = await addressRepository.findById(addressId);
  if (!address || address.userId !== userId) {
    throw new NotFoundError("Address not found");
  }
  const { id: _id, userId: _userId, isDefault: _isDefault, ...shippingAddress } = address;

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

  for (const item of items) {
    const inventory = await inventoryService.getByProductId(item.productId);
    if (inventory.availableStock < item.quantity) {
      throw new InsufficientStockError(`Insufficient stock for product ${item.name}`);
    }
  }

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await orderRepository.create(userId, items, totalItems, subtotal, shippingAddress);

  let decreasedCount = 0;
  try {
    for (const item of items) {
      await inventoryService.decreaseStock(item.productId, item.quantity);
      decreasedCount++;
    }
  } catch (error) {
    try {
      for (let i = 0; i < decreasedCount; i++) {
        await inventoryService.restoreStock(items[i].productId, items[i].quantity);
      }
      await orderRepository.deleteById(order.id);
    } catch (rollbackError) {
      console.error("Checkout rollback failed:", rollbackError);
    }
    throw error;
  }

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
  if (!canTransitionOrderStatus(order.status, newStatus, "customer")) {
    throw new InvalidDataError(`Cannot transition from ${order.status} to ${newStatus}`);
  }
  return applyStatusTransition(order, newStatus);
};

export const findAllAdmin = async () => {
  const orders = await orderRepository.findAll();
  return orders.map(toResponse);
};

export const findByIdAdmin = async (orderId: string) => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  return toResponse(order);
};

export const updateStatusAdmin = async (orderId: string, newStatus: OrderStatus) => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (!canTransitionOrderStatus(order.status, newStatus, "admin")) {
    throw new InvalidDataError(`Cannot transition from ${order.status} to ${newStatus}`);
  }
  return applyStatusTransition(order, newStatus);
};
