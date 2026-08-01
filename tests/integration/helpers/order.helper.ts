import { OrderModel } from "../../../src/modules/orders/models/order.model";
import type { Order, OrderItem } from "../../../src/types";

export const createTestOrder = async (
  userId: string,
  items: OrderItem[],
  overrides: Partial<Order> = {}
): Promise<Order> => {
  const { id, ...rest } = overrides;
  const order = await OrderModel.create({
    userId,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    status: "pending",
    paymentStatus: "pending",
    ...rest,
  });
  return order.toJSON() as unknown as Order;
};
