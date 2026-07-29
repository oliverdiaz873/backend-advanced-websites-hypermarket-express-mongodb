import * as cartRepository from "../repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { CartItem, CartResponse } from "../../../types";

const resolveItem = (item: { productId: string; quantity: number }): CartItem | null => {
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

export const getCart = (userId: string): CartResponse => {
  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  const resolvedItems = cart.items.map(resolveItem).filter(Boolean) as CartItem[];
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

export const addItem = (userId: string, productId: string, quantity: number): CartResponse => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError("Quantity must be a positive integer");
  }

  const product = productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }

  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  cartRepository.addItem(userId, productId, quantity);
  return getCart(userId);
};

export const updateItem = (userId: string, productId: string, quantity: number): CartResponse => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError("Quantity must be a positive integer");
  }

  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }

  const updated = cartRepository.updateItem(userId, productId, quantity);
  if (!updated) {
    throw new NotFoundError("Cart item not found");
  }

  return getCart(userId);
};

export const removeItem = (userId: string, productId: string): CartResponse => {
  const cart = cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }

  const updated = cartRepository.removeItem(userId, productId);
  if (!updated) {
    throw new NotFoundError("Cart item not found");
  }

  return getCart(userId);
};

export const clearCart = (userId: string): CartResponse => {
  let cart = cartRepository.findByUserId(userId);
  if (!cart) {
    cart = cartRepository.createCart(userId);
  }

  cartRepository.clearCart(userId);
  return getCart(userId);
};
