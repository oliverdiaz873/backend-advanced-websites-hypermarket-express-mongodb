import { CartModel } from "../models/cart.model";
import { isValidObjectId, toObjectId } from "../../../shared/utils/mongo";
import type { Cart } from "../../../types";

export const findByUserId = async (userId: string): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const doc = await CartModel.findOne({ userId: toObjectId(userId) });
  return doc ? (doc.toJSON() as unknown as Cart) : null;
};

export const createCart = async (userId: string): Promise<Cart> => {
  const doc = await CartModel.create({ userId: toObjectId(userId), items: [] });
  return doc.toJSON() as unknown as Cart;
};

export const addItem = async (userId: string, productId: string, quantity: number): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.items.push({ productId, quantity });
  }

  await cart.save();
  return cart.toJSON() as unknown as Cart;
};

export const updateItem = async (userId: string, productId: string, quantity: number): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  const item = cart.items.find((i) => i.productId === productId);
  if (!item) return null;

  item.quantity = quantity;
  await cart.save();
  return cart.toJSON() as unknown as Cart;
};

export const removeItem = async (userId: string, productId: string): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  const index = cart.items.findIndex((i) => i.productId === productId);
  if (index === -1) return null;

  cart.items.splice(index, 1);
  await cart.save();
  return cart.toJSON() as unknown as Cart;
};

export const clearCart = async (userId: string): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const doc = await CartModel.findOneAndUpdate(
    { userId: toObjectId(userId) },
    { $set: { items: [] } },
    { returnDocument: "after" }
  );
  return doc ? (doc.toJSON() as unknown as Cart) : null;
};
