import type { Cart, CartResponse } from "../../../src/types";
import { USER_ID } from "./user.factory";
import { PRODUCT_ID } from "./product.factory";

export const CART_ID = "64b0000000000000000000f1";

export const makeCart = (overrides: Partial<Cart> = {}): Cart => ({
  id: CART_ID,
  userId: USER_ID,
  items: [{ productId: PRODUCT_ID, quantity: 2 }],
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

export const makeCartResponse = (overrides: Partial<CartResponse> = {}): CartResponse => ({
  items: [
    {
      productId: PRODUCT_ID,
      name: "Arroz 1kg",
      price: 89.5,
      unitPrice: 89.5,
      isOffer: false,
      quantity: 2,
      image: "https://example.com/arroz.png",
      unit: "kg",
      unitQuantity: 1,
    },
  ],
  totalItems: 2,
  subtotal: 179,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
