import * as orderRepository from "../repositories/order.repository";
import * as cartRepository from "../../cart/repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import * as addressRepository from "../../addresses/repositories/address.repository";
import * as inventoryService from "../../inventory/services/inventory.service";
import * as userRepository from "../../users/repositories/user.repository";
import * as auditService from "../../audit/services/audit.service";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { InsufficientStockError } from "../../../shared/errors/insufficient-stock.error";
import { canTransitionOrderStatus } from "../../../shared/constants/order-status";
import { isValidObjectId } from "../../../shared/utils/mongo";
import { ORDER_SORT_FIELDS } from "../constants/order-sort-fields";
import type {
  AdminOrder,
  Order,
  OrderItem,
  OrderPageResult,
  OrderQuery,
  OrderSortField,
  OrderStatus,
} from "../../../types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

const refineStatus = (value: unknown): OrderStatus | undefined => {
  if (typeof value === "string" && (ORDER_STATUSES as string[]).includes(value)) {
    return value as OrderStatus;
  }
  return undefined;
};

const refineSortBy = (value: unknown): OrderSortField | undefined => {
  if (typeof value === "string" && (ORDER_SORT_FIELDS as readonly string[]).includes(value)) {
    return value as OrderSortField;
  }
  return undefined;
};

const toResponse = (order: Order) => ({
  id: order.id,
  userId: order.userId,
  items: order.items,
  shippingAddress: order.shippingAddress,
  totalItems: order.totalItems,
  subtotal: order.subtotal,
  status: order.status,
  paymentStatus: order.paymentStatus,
  statusHistory: order.statusHistory,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const applyStatusTransition = async (
  order: Order,
  newStatus: OrderStatus,
  actorId?: string,
  note?: string
): Promise<ReturnType<typeof toResponse>> => {
  const historyEntry = { status: newStatus, changedAt: new Date(), by: actorId, note };
  const updated = await orderRepository.updateStatus(order.id, order.status, newStatus, historyEntry);
  if (!updated) {
    const current = await orderRepository.findById(order.id);
    if (!current) {
      throw new NotFoundError("Order not found");
    }
    return toResponse(current);
  }

  if (newStatus === "cancelled") {
    for (const item of updated.items) {
      await inventoryService.releaseReservation(item.productId, item.quantity, order.id, actorId);
    }
  }

  if (newStatus === "completed") {
    for (const item of updated.items) {
      await inventoryService.completeReservation(item.productId, item.quantity, order.id, actorId);
    }
  }

  void auditService.log({
    userId: actorId,
    action: newStatus === "cancelled" ? "CANCEL_ORDER" : "UPDATE_ORDER_STATUS",
    resource: "order",
    resourceId: order.id,
    success: true,
    details: { from: order.status, to: newStatus },
  });

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

  const order = await orderRepository.create(
    userId,
    items,
    totalItems,
    subtotal,
    shippingAddress,
    userId
  );

  let reservedCount = 0;
  try {
    for (const item of items) {
      await inventoryService.reserveStock(item.productId, item.quantity, order.id, userId);
      reservedCount++;
    }
  } catch (error) {
    try {
      for (let i = 0; i < reservedCount; i++) {
        await inventoryService.releaseReservation(items[i].productId, items[i].quantity, order.id, userId);
      }
      await orderRepository.deleteById(order.id);
    } catch (rollbackError) {
      console.error("Checkout rollback failed:", rollbackError);
    }
    throw error;
  }

  await cartRepository.clearCart(userId);

  void auditService.log({
    userId,
    action: "CREATE_ORDER",
    resource: "order",
    resourceId: order.id,
    success: true,
    details: { totalItems, subtotal, itemCount: items.length },
  });

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
  return applyStatusTransition(order, newStatus, userId);
};

export const getPageAdmin = async (query: Partial<OrderQuery>): Promise<OrderPageResult> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
  const sortBy = refineSortBy(query.sortBy);
  const status = refineStatus(query.status);

  let userIds: string[] | undefined;
  let orderId: string | undefined;
  if (typeof query.q === "string" && query.q.trim()) {
    const q = query.q.trim();
    userIds = await userRepository.findIdsByNameOrEmail(q);
    orderId = q;
    if (userIds.length === 0 && !isValidObjectId(q)) {
      return { items: [], total: 0, pagination: { page, limit, total: 0, pages: 1 } };
    }
  }
  if (query.customerId) {
    userIds = userIds ? [...userIds, query.customerId] : [query.customerId];
  }

  const result = await orderRepository.findPage({
    page,
    limit,
    status,
    userIds,
    orderId,
    sortBy,
    sortOrder,
  });

  const items = await enrichCustomer(result.items);
  return { items, total: result.total, pagination: result.pagination };
};

export const getByIdAdmin = async (orderId: string): Promise<AdminOrder> => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  const [enriched] = await enrichCustomer([order]);
  return enriched;
};

export const updateStatusAdmin = async (
  orderId: string,
  newStatus: OrderStatus,
  actorId?: string,
  note?: string
): Promise<AdminOrder> => {
  const order = await orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError("Order not found");
  }
  if (!canTransitionOrderStatus(order.status, newStatus, "admin")) {
    throw new InvalidDataError(`Cannot transition from ${order.status} to ${newStatus}`);
  }
  const updated = await applyStatusTransition(order, newStatus, actorId, note);
  const [enriched] = await enrichCustomer([updated as unknown as Order]);
  return enriched;
};

const enrichCustomer = async (items: Order[]): Promise<AdminOrder[]> => {
  if (items.length === 0) return [];

  const ids = Array.from(new Set(items.map((item) => item.userId)));
  const users = await userRepository.findByIds(ids);
  const byId = new Map(users.map((user) => [user.id, user]));

  return items.map((order) => {
    const user = byId.get(order.userId);
    return {
      ...toResponse(order),
      ...(user ? { customer: { id: user.id, name: user.name, email: user.email } } : {}),
    };
  });
};
