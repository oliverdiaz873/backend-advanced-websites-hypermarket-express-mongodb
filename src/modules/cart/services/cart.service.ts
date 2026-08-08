import * as cartRepository from "../repositories/cart.repository";
import * as productRepository from "../../products/repositories/product.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { CartItem, CartResponse } from "../../../types";

const resolveItem = async (item: { productId: string; quantity: number }): Promise<CartItem | null> => {
  const product = await productRepository.findById(item.productId);
  if (!product) return null;
  return {
    productId: item.productId,
    name: product.name,
    price: product.price,
    image: product.image ?? "",
    quantity: item.quantity,
  };
};

export const getCart = async (userId: string): Promise<CartResponse> => {
  let cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  const resolvedItems = (await Promise.all(cart.items.map(resolveItem))).filter(Boolean) as CartItem[];
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

export const addItem = async (userId: string, productId: string, quantity: number): Promise<CartResponse> => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError("Quantity must be a positive integer");
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  if (!product.isAvailable) {
    throw new InvalidDataError("Product is not available");
  }

  let cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  await cartRepository.addItem(userId, productId, quantity);
  return getCart(userId);
};

export const updateItem = async (userId: string, productId: string, quantity: number): Promise<CartResponse> => {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new InvalidDataError("Quantity must be a positive integer");
  }

  const product = await productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError("Product not found");
  }
  if (!product.isAvailable) {
    throw new InvalidDataError("Product is not available");
  }

  const cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }

  const updated = await cartRepository.updateItem(userId, productId, quantity);
  if (!updated) {
    throw new NotFoundError("Cart item not found");
  }

  return getCart(userId);
};

export const removeItem = async (userId: string, productId: string): Promise<CartResponse> => {
  const cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    throw new NotFoundError("Cart not found");
  }

  const updated = await cartRepository.removeItem(userId, productId);
  if (!updated) {
    throw new NotFoundError("Cart item not found");
  }

  return getCart(userId);
};

export const clearCart = async (userId: string): Promise<CartResponse> => {
  let cart = await cartRepository.findByUserId(userId);
  if (!cart) {
    cart = await cartRepository.createCart(userId);
  }

  await cartRepository.clearCart(userId);
  return getCart(userId);
};
