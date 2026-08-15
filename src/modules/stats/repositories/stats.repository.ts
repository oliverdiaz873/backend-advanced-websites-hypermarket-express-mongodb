import { OrderModel } from "../../orders/models/order.model";
import { ProductModel } from "../../products/models/product.model";
import { InventoryModel } from "../../inventory/models/inventory.model";
import { ContactMessageModel } from "../../contact/models/contact-message.model";
import { UserModel } from "../../users/models/user.model";
import type {
  CategorySalesStat,
  InventorySummary,
  RevenueTrendPoint,
  StatsFilter,
  TopProductStat,
} from "../../../types";

/** Construye el $match común sobre órdenes a partir del filtro resuelto. */
const buildOrderMatch = (filter: StatsFilter): Record<string, unknown> => {
  const match: Record<string, unknown> = {};
  if (filter.from || filter.to) {
    match.createdAt = {
      ...(filter.from ? { $gte: filter.from } : {}),
      ...(filter.to ? { $lt: filter.to } : {}),
    };
  }
  if (filter.productIds !== undefined) {
    match.items = { $elemMatch: { productId: { $in: filter.productIds } } };
  }
  return match;
};

/** Ids de los productos de una categoría (resuelve categoryId -> productIds). */
export const findProductIdsByCategory = async (categoryId: string): Promise<string[]> => {
  const products = await ProductModel.find({ categoryId }).select("_id").lean<Array<{ _id: string }>>();
  return products.map((product) => product._id.toString());
};

export const countOrders = async (): Promise<number> => OrderModel.countDocuments();

export const countOrdersByStatus = async (filter?: StatsFilter): Promise<Record<string, number>> => {
  const match = filter ? buildOrderMatch(filter) : {};
  const rows = await OrderModel.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row._id] = row.count;
    return acc;
  }, {});
};

/** Total de órdenes (todos los estados) dentro del filtro. */
export const countOrdersSince = async (filter: StatsFilter): Promise<number> =>
  OrderModel.countDocuments(buildOrderMatch(filter));

export const countPendingOrders = async (): Promise<number> =>
  OrderModel.countDocuments({ status: "pending" });

export const countCustomers = async (): Promise<number> => UserModel.countDocuments({ role: "customer" });

export const countNewCustomersSince = async (date: Date): Promise<number> =>
  UserModel.countDocuments({ role: "customer", createdAt: { $gte: date } });

export const countProducts = async (): Promise<number> => ProductModel.countDocuments();

export const countLowStock = async (): Promise<number> =>
  InventoryModel.countDocuments({ minStock: { $ne: null }, $expr: { $lte: ["$stock", "$minStock"] } });

export const countOutOfStock = async (): Promise<number> =>
  InventoryModel.countDocuments({ $expr: { $lte: [{ $subtract: ["$stock", "$reservedStock"] }, 0] } });

export const countPendingContactMessages = async (): Promise<number> =>
  ContactMessageModel.countDocuments({ status: "pending" });

/** Ingresos (subtotal) de órdenes completadas dentro del filtro. */
export const sumRevenue = async (filter: StatsFilter): Promise<number> => {
  const rows = await OrderModel.aggregate<{ total: number }>([
    { $match: { status: "completed", ...buildOrderMatch(filter) } },
    { $group: { _id: null, total: { $sum: "$subtotal" } } },
  ]);
  return rows.length > 0 ? (rows[0].total ?? 0) : 0;
};

/** Ingresos (subtotal) de órdenes completadas desde una fecha (sin límite superior). */
export const sumRevenueSince = (date: Date): Promise<number> => sumRevenue({ from: date });

export const sumRevenueByDay = async (filter: StatsFilter): Promise<RevenueTrendPoint[]> => {
  const rows = await OrderModel.aggregate<{ _id: { date: string }; total: number }>([
    { $match: { status: "completed", ...buildOrderMatch(filter) } },
    {
      $group: {
        _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } },
        total: { $sum: "$subtotal" },
      },
    },
    { $sort: { "_id.date": 1 } },
  ]);
  return rows.map((row) => ({ date: row._id.date, total: row.total }));
};

export const topProductsByQuantity = async (limit: number, filter: StatsFilter): Promise<TopProductStat[]> => {
  const rows = await OrderModel.aggregate<TopProductStat>([
    { $match: { status: "completed", ...buildOrderMatch(filter) } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        name: { $first: "$items.name" },
        quantity: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { quantity: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: "$_id", name: 1, quantity: 1, revenue: 1 } },
  ]);
  return rows;
};

export const sumRevenueByCategory = async (filter: StatsFilter): Promise<CategorySalesStat[]> => {
  const rows = await OrderModel.aggregate<CategorySalesStat>([
    { $match: { status: "completed", ...buildOrderMatch(filter) } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        orders: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category.slug",
        category: { $first: "$product.category.name" },
        slug: { $first: "$product.category.slug" },
        revenue: { $sum: "$revenue" },
        orders: { $sum: "$orders" },
      },
    },
    { $sort: { revenue: -1 } },
    { $project: { _id: 0, category: 1, slug: 1, revenue: 1, orders: 1 } },
  ]);
  return rows;
};

export const inventorySummary = async (): Promise<InventorySummary> => {
  const [byProduct, lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
    InventoryModel.aggregate<{ value: number; totalUnits: number }>([
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ["$stock", "$product.price"] } },
          totalUnits: { $sum: "$stock" },
        },
      },
    ]),
    countLowStock(),
    countOutOfStock(),
    countProducts(),
  ]);

  const row = byProduct[0];
  return {
    inventoryValue: row?.value ?? 0,
    totalUnits: row?.totalUnits ?? 0,
    totalProducts,
    lowStockCount,
    outOfStockCount,
  };
};
