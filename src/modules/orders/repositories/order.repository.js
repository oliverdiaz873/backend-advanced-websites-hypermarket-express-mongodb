const { randomUUID } = require('crypto');
const orders = require('../data/orders.data');
const { ORDER_STATUS, PAYMENT_STATUS } = require('../../../shared/constants/order-status');

const findByUserId = (userId) => {
  return orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const findById = (orderId) => {
  return orders.find((o) => o.id === orderId) || null;
};

const create = (userId, items, totalItems, subtotal) => {
  const now = new Date().toISOString();
  const order = {
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

const updateStatus = (orderId, status) => {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;

  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
};

module.exports = { findByUserId, findById, create, updateStatus };