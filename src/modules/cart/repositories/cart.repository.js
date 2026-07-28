const { randomUUID } = require('crypto');
const carts = require('../data/cart.data');

const findByUserId = (userId) => {
  return carts.find((c) => c.userId === userId) || null;
};

const createCart = (userId) => {
  const now = new Date().toISOString();
  const cart = {
    id: randomUUID(),
    userId,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  carts.push(cart);
  return cart;
};

const addItem = (userId, productId, quantity) => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  cart.updatedAt = new Date().toISOString();
  return cart;
};

const updateItem = (userId, productId, quantity) => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  const item = cart.items.find((i) => i.productId === productId);
  if (!item) return null;

  item.quantity = quantity;
  cart.updatedAt = new Date().toISOString();
  return cart;
};

const removeItem = (userId, productId) => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  const index = cart.items.findIndex((i) => i.productId === productId);
  if (index === -1) return null;

  cart.items.splice(index, 1);
  cart.updatedAt = new Date().toISOString();
  return cart;
};

const clearCart = (userId) => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  return cart;
};

module.exports = { findByUserId, createCart, addItem, updateItem, removeItem, clearCart };