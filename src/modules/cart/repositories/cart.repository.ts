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

/**
 * Prepara `$set`/`$unset` posicionales del snapshot. La key de referencia usa
 * `unitPrice` como marcador y se reescribe para `originalPrice`/`discountPercentage`,
 * de modo que funcione con `items.$` y `items.$[el]`.
 *
 * Semántica (compatible con la versión previa): si el snapshot no trae
 * `originalPrice`/`discountPercentage`, esos campos se eliminan del item
 * (el snapshot autoritativo se refresca por completo).
 */
const snapshotUpdate = (
  refKey: "items.$.unitPrice" | "items.$[el].unitPrice",
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): { set: Record<string, number>; unset: Record<string, number> } => {
  const set: Record<string, number> = {};
  const unset: Record<string, number> = {};
  if (!snapshot) return { set, unset };

  if (snapshot.unitPrice !== undefined) {
    set[refKey] = snapshot.unitPrice;
  } else {
    unset[refKey] = 1;
  }
  if (snapshot.originalPrice !== undefined) {
    set[refKey.replace("unitPrice", "originalPrice")] = snapshot.originalPrice;
  } else {
    unset[refKey.replace("unitPrice", "originalPrice")] = 1;
  }
  if (snapshot.discountPercentage !== undefined) {
    set[refKey.replace("unitPrice", "discountPercentage")] = snapshot.discountPercentage;
  } else {
    unset[refKey.replace("unitPrice", "discountPercentage")] = 1;
  }
  return { set, unset };
};

const applyAtomicInc = async (
  userId: string,
  productId: string,
  quantity: number,
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): Promise<Cart | null> => {
  const userIdObj = toObjectId(userId);
  const { set, unset } = snapshotUpdate("items.$[el].unitPrice", snapshot);
  const update: Record<string, Record<string, number>> = { $inc: { "items.$[el].quantity": quantity } };
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const result = await CartModel.updateOne(
    { userId: userIdObj, "items.productId": productId },
    update,
    { arrayFilters: [{ "el.productId": productId }] }
  );

  if (result.matchedCount === 0) {
    await CartModel.updateOne(
      { userId: userIdObj },
      { $push: { items: toStored({ productId, quantity, ...snapshot }) } }
    );
  }

  return findByUserId(userId);
};

/**
 * Agrega un item al carrito de forma atómica (`$inc` sobre el elemento existente).
 * Evita el read-modify-write que perdía incrementos bajo mutaciones concurrentes.
 */
export const addItem = async (
  userId: string,
  productId: string,
  quantity: number,
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  return applyAtomicInc(userId, productId, quantity, snapshot);
};

/**
 * Reemplaza la cantidad de un item existente de forma atómica.
 */
export const updateItem = async (
  userId: string,
  productId: string,
  quantity: number,
  snapshot?: Omit<CartItemStored, "productId" | "quantity">
): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const userIdObj = toObjectId(userId);

  const { set, unset } = snapshotUpdate("items.$.unitPrice", snapshot);
  const update: Record<string, Record<string, number>> = { $set: { "items.$.quantity": quantity } };
  Object.assign(update.$set, set);
  if (Object.keys(unset).length > 0) update.$unset = unset;

  const result = await CartModel.updateOne(
    { userId: userIdObj, "items.productId": productId },
    update
  );

  if (result.matchedCount === 0) return null;
  return findByUserId(userId);
};

/** Acumula una lista de items (merge guest→server): suma cantidades y refresca snapshots. */
export const mergeItems = async (userId: string, items: CartItemStored[]): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;

  for (const incoming of items) {
    await applyAtomicInc(userId, incoming.productId, incoming.quantity, incoming);
  }

  return findByUserId(userId);
};

export const removeItem = async (userId: string, productId: string): Promise<Cart | null> => {
  if (!isValidObjectId(userId)) return null;
  const result = await CartModel.updateOne(
    { userId: toObjectId(userId), "items.productId": productId },
    { $pull: { items: { productId } } }
  );
  if (result.modifiedCount === 0) return null;
  return findByUserId(userId);
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
