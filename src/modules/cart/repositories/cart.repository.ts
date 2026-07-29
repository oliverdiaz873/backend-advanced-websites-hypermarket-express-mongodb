import { randomUUID } from "crypto";
import carts from "../data/cart.data";
import type { Cart } from "../../../types";

export const findByUserId = (userId: string): Cart | null => {
  return carts.find((c) => c.userId === userId) || null;
};

export const createCart = (userId: string): Cart => {
  const now = new Date().toISOString();
  const cart: Cart = {
    id: randomUUID(),
    userId,
    items: [],
    createdAt: now,
    updatedAt: now,
  };
  carts.push(cart);
  return cart;
};

export const addItem = (userId: string, productId: string, quantity: number): Cart | null => {
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

export const updateItem = (userId: string, productId: string, quantity: number): Cart | null => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  const item = cart.items.find((i) => i.productId === productId);
  if (!item) return null;

  item.quantity = quantity;
  cart.updatedAt = new Date().toISOString();
  return cart;
};

export const removeItem = (userId: string, productId: string): Cart | null => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  const index = cart.items.findIndex((i) => i.productId === productId);
  if (index === -1) return null;

  cart.items.splice(index, 1);
  cart.updatedAt = new Date().toISOString();
  return cart;
};

export const clearCart = (userId: string): Cart | null => {
  const cart = carts.find((c) => c.userId === userId);
  if (!cart) return null;

  cart.items = [];
  cart.updatedAt = new Date().toISOString();
  return cart;
};
