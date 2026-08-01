import type { Order } from "../../../src/types";
import { USER_ID } from "./user.factory";
import { PRODUCT_ID } from "./product.factory";
import { makeAddress } from "./address.factory";

export const ORDER_ID = "64b00000000000000000001001";

export const makeOrder = (overrides: Partial<Order> = {}): Order => {
  const address = makeAddress();
  const { id: _id, userId: _userId, isDefault: _isDefault, ...shippingAddress } = address;
  return {
    id: ORDER_ID,
    userId: USER_ID,
    items: [
      { productId: PRODUCT_ID, name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", quantity: 2 },
    ],
    shippingAddress,
    totalItems: 2,
    subtotal: 179,
    status: "pending",
    paymentStatus: "pending",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
};
