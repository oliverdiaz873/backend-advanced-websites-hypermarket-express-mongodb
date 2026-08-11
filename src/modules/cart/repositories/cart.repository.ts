import { CartModel } from "../models/cart.model";
import { isValidObjectId, toObjectId } from "../../../shared/utils/mongo";
import type { Cart, CartItemStored } from "../../../types";

export const findByUserId = async (userId: string): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const doc = await CartModel.findOne({ userId: toObjectId(userId) });
  return doc ? (doc.toJSON() as unknown as Cart) : null;
};

export const createCart = async (userId: string): Promise<Cart> => {
  const doc = await CartModel.findOneAndUpdate(
    { userId: toObjectId(userId) },
    { $setOnInsert: { items: [] } },
    { upsert: true, returnDocument: "after" }
  );
  if (!doc) {
    throw new Error("Unable to create cart");
  }
  return doc.toJSON() as unknown as Cart;
};

const toStored = (item: CartItemStored): CartItemStored => ({
  productId: item.productId,
  quantity: item.quantity,
  ...(item.unitPrice !== undefined ? { unitPrice: item.unitPrice } : {}),
  ...(item.originalPrice !== undefined ? { originalPrice: item.originalPrice } : {}),
  ...(item.discountPercentage !== undefined ? { discountPercentage: item.discountPercentage } : {}),
});

export const addItem = async (
  userId: string,
  productId: string,
  quantity: number,
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  const existing = cart.items.find((i) => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
    if (snapshot) {
      existing.unitPrice = snapshot.unitPrice;
      existing.originalPrice = snapshot.originalPrice;
      existing.discountPercentage = snapshot.discountPercentage;
    }
  } else {
    cart.items.push(toStored({ productId, quantity, ...snapshot }));
  }

  await cart.save();
  return cart.toJSON() as unknown as Cart;
};

export const updateItem = async (
  userId: string,
  productId: string,
  quantity: number,
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  const item = cart.items.find((i) => i.productId === productId);
  if (!item) return null;

  item.quantity = quantity;
  if (snapshot) {
    item.unitPrice = snapshot.unitPrice;
    item.originalPrice = snapshot.originalPrice;
    item.discountPercentage = snapshot.discountPercentage;
  }
  await cart.save();
  return cart.toJSON() as unknown as Cart;
};

/** Acumula una lista de items (merge guest→server): suma cantidades y refresca snapshots. */
export const mergeItems = async (userId: string, items: CartItemStored[]): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const cart = await CartModel.findOne({ userId: toObjectId(userId) });
  if (!cart) return null;

  for (const incoming of items) {
    const existing = cart.items.find((i) => i.productId === incoming.productId);
    if (existing) {
      existing.quantity += incoming.quantity;
      if (incoming.unitPrice !== undefined) {
        existing.unitPrice = incoming.unitPrice;
        existing.originalPrice = incoming.originalPrice;
        existing.discountPercentage = incoming.discountPercentage;
      }
    } else {
      cart.items.push(toStored(incoming));
    }
  }

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
