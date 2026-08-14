import * as productService from "../../products/services/product.service";
import * as orderService from "../../orders/services/order.service";
import * as customerService from "../../customers/services/customer.service";
import type { AdminProduct } from "../../products/presenters/product.presenter";
import type { AdminOrder, Customer } from "../../../types";

const DEFAULT_SEARCH_LIMIT = 5;
const MAX_SEARCH_LIMIT = 20;

export interface AdminSearchResult {
  products: AdminProduct[];
  orders: AdminOrder[];
  customers: Customer[];
}

export const EMPTY_SEARCH_RESULT: AdminSearchResult = {
  products: [],
  orders: [],
  customers: [],
};

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const search = async (query: { q?: string; limit?: number }): Promise<AdminSearchResult> => {
  const q = typeof query.q === "string" && query.q.trim() ? query.q.trim() : undefined;
  const limit = Math.min(MAX_SEARCH_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_SEARCH_LIMIT)));

  if (!q) {
    return EMPTY_SEARCH_RESULT;
  }

  const [products, orders, customers] = await Promise.all([
    productService.getAdminPage({ page: 1, limit, q }),
    orderService.getPageAdmin({ page: 1, limit, q }),
    customerService.getPage({ page: 1, limit, q }),
  ]);

  return {
    products: products.data,
    orders: orders.items,
    customers: customers.items,
  };
};
