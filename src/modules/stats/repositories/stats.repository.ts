import { OrderModel } from "../../orders/models/order.model";
import { ProductModel } from "../../products/models/product.model";
import { InventoryModel } from "../../inventory/models/inventory.model";
import { ContactMessageModel } from "../../contact/models/contact-message.model";
import { UserModel } from "../../users/models/user.model";

export const countOrders = async (): Promise<number> => OrderModel.countDocuments();

export const countOrdersByStatus = async (): Promise<Record<string, number>> => {
  const rows = await OrderModel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
};

export const countCustomers = async (): Promise<number> => UserModel.countDocuments({ role: "customer" });

export const countProducts = async (): Promise<number> => ProductModel.countDocuments();

export const countLowStock = async (): Promise<number> =>
  InventoryModel.countDocuments({ minStock: { $ne: null }, $expr: { $lte: ["$stock", "$minStock"] } });

export const countPendingContactMessages = async (): Promise<number> =>
  ContactMessageModel.countDocuments({ status: "pending" });

export const sumRevenueSince = async (date: Date): Promise<number> => {
  const rows = await OrderModel.aggregate<{ total: number }>([
    { $match: { createdAt: { $gte: date } } },
    { $group: { _id: null, total: { $sum: "$subtotal" } } },
  ]);
  return rows.length > 0 ? (rows[0].total ?? 0) : 0;
};
