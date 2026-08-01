import { CartModel } from "../../../src/modules/cart/models/cart.model";

export const createTestCart = async (userId: string) => {
  const cart = await CartModel.create({ userId, items: [] });
  return cart.toJSON();
};

export const addCartItem = async (userId: string, productId: string, quantity = 1) => {
  const cart = await CartModel.findOneAndUpdate(
    { userId },
    { $push: { items: { productId, quantity } } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return cart.toJSON();
};
