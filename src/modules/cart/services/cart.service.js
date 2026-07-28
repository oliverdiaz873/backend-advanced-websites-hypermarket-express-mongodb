const cartRepository = require('../repositories/cart.repository');
const productRepository = require('../../products/repositories/product.repository');
const NotFoundError = require('../../../shared/errors/not-found.error');
const InvalidDataError = require('../../../shared/errors/invalid-data.error');

const resolveItem = (item) => {
  const product = productRepository.findById(item.productId);
  if (!product) return null;
  return {
    productId: item.productId,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity: item.quantity,
  };
};

const getCart = (userId) => {
  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  const resolvedItems = cart.items.map(resolveItem).filter(Boolean);
  const totalItems = resolvedItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return {
    items: resolvedItems,
    totalItems,
    subtotal,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt,
  };
};

const addItem = (userId, productId, quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError('Quantity must be a positive integer');
  }

  const product = productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  cartRepository.addItem(userId, productId, quantity);
  return getCart(userId);
};

const updateItem = (userId, productId, quantity) => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError('Quantity must be a positive integer');
  }

  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const updated = cartRepository.updateItem(userId, productId, quantity);
  if (!updated) {
    throw new NotFoundError('Cart item not found');
  }

  return getCart(userId);
};

const removeItem = (userId, productId) => {
  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError('Cart not found');
  }

  const updated = cartRepository.removeItem(userId, productId);
  if (!updated) {
    throw new NotFoundError('Cart item not found');
  }

  return getCart(userId);
};

const clearCart = (userId) => {
  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  cartRepository.clearCart(userId);
  return getCart(userId);
};

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };