const orderRepository = require('../repositories/order.repository');
const cartRepository = require('../../cart/repositories/cart.repository');
const productRepository = require('../../products/repositories/product.repository');
const NotFoundError = require('../../../shared/errors/not-found.error');
const InvalidDataError = require('../../../shared/errors/invalid-data.error');
const { ORDER_STATUS, ALLOWED_TRANSITIONS } = require('../../../shared/constants/order-status');

const toResponse = (order) => ({
  id: order.id,
  items: order.items,
  totalItems: order.totalItems,
  subtotal: order.subtotal,
  status: order.status,
  paymentStatus: order.paymentStatus,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const create = (userId) => {
  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }
  if (cart.items.length === 0) {
    throw new InvalidDataError('Cart is empty');
  }

  const items = cart.items.map((item) => {
    const product = productRepository.findById(item.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
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

const findByUser = (userId) => {
  const orders = orderRepository.findByUserId(userId);
  return orders.map(toResponse);
};

const findById = (userId, orderId) => {
  const order = orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }
  if (order.userId !== userId) {
    throw new NotFoundError('Order not found');
  }
  return toResponse(order);
};

const updateStatus = (userId, orderId, newStatus) => {
  const order = orderRepository.findById(orderId);
  if (!order) {
    throw new NotFoundError('Order not found');
  }
  if (order.userId !== userId) {
    throw new NotFoundError('Order not found');
  }

  const allowed = ALLOWED_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new InvalidDataError(`Cannot transition from ${order.status} to ${newStatus}`);
  }

  const updated = orderRepository.updateStatus(orderId, newStatus);
  return toResponse(updated);
};

module.exports = { create, findByUser, findById, updateStatus };