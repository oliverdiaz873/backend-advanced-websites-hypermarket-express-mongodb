import * as adminSearchService from "../../../src/modules/admin-search/services/admin-search.service";
import { makeProduct } from "../factories/product.factory";
import { makeOrder } from "../factories/order.factory";
import { makeCustomer } from "../factories/customer.factory";
import type { AdminProduct } from "../../../src/modules/products/presenters/product.presenter";
import type { AdminOrder, Customer } from "../../../src/types";

jest.mock("../../../src/modules/products/services/product.service", () => ({
  getAdminPage: jest.fn(),
}));
jest.mock("../../../src/modules/orders/services/order.service", () => ({
  getPageAdmin: jest.fn(),
}));
jest.mock("../../../src/modules/customers/services/customer.service", () => ({
  getPage: jest.fn(),
}));

import * as productService from "../../../src/modules/products/services/product.service";
import * as orderService from "../../../src/modules/orders/services/order.service";
import * as customerService from "../../../src/modules/customers/services/customer.service";

const adminProduct = makeProduct() as unknown as AdminProduct;
const adminOrder = { ...makeOrder(), customer: { id: "c1", name: "Oliver Diaz", email: "oliver@example.com" } } as AdminOrder;
const customer = makeCustomer() as Customer;

describe("admin-search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("search", () => {
    it("combina productos, órdenes y clientes en paralelo", async () => {
      (productService.getAdminPage as jest.Mock).mockResolvedValue({
        data: [adminProduct],
        pagination: { page: 1, limit: 5, total: 1, pages: 1 },
      });
      (orderService.getPageAdmin as jest.Mock).mockResolvedValue({
        items: [adminOrder],
        total: 1,
        pagination: { page: 1, limit: 5, total: 1, pages: 1 },
      });
      (customerService.getPage as jest.Mock).mockResolvedValue({
        items: [customer],
        total: 1,
        pagination: { page: 1, limit: 5, total: 1, pages: 1 },
      });

      const result = await adminSearchService.search({ q: "  oliver  ", limit: 5 });

      expect(productService.getAdminPage).toHaveBeenCalledWith({ page: 1, limit: 5, q: "oliver" });
      expect(orderService.getPageAdmin).toHaveBeenCalledWith({ page: 1, limit: 5, q: "oliver" });
      expect(customerService.getPage).toHaveBeenCalledWith({ page: 1, limit: 5, q: "oliver" });
      expect(result).toEqual({
        products: [adminProduct],
        orders: [adminOrder],
        customers: [customer],
      });
    });

    it("devuelve arrays vacíos sin llamar a los servicios si q está vacío", async () => {
      const result = await adminSearchService.search({ q: "   ", limit: 5 });

      expect(productService.getAdminPage).not.toHaveBeenCalled();
      expect(orderService.getPageAdmin).not.toHaveBeenCalled();
      expect(customerService.getPage).not.toHaveBeenCalled();
      expect(result).toEqual({ products: [], orders: [], customers: [] });
    });

    it("aplica limit por defecto 5 y pasa el q recortado", async () => {
      (productService.getAdminPage as jest.Mock).mockResolvedValue({ data: [] });
      (orderService.getPageAdmin as jest.Mock).mockResolvedValue({ items: [] });
      (customerService.getPage as jest.Mock).mockResolvedValue({ items: [] });

      await adminSearchService.search({ q: "arroz" });

      expect(productService.getAdminPage).toHaveBeenCalledWith({ page: 1, limit: 5, q: "arroz" });
      expect(orderService.getPageAdmin).toHaveBeenCalledWith({ page: 1, limit: 5, q: "arroz" });
      expect(customerService.getPage).toHaveBeenCalledWith({ page: 1, limit: 5, q: "arroz" });
    });

    it("limita a un máximo de 20 por colección", async () => {
      (productService.getAdminPage as jest.Mock).mockResolvedValue({ data: [] });
      (orderService.getPageAdmin as jest.Mock).mockResolvedValue({ items: [] });
      (customerService.getPage as jest.Mock).mockResolvedValue({ items: [] });

      await adminSearchService.search({ q: "arroz", limit: 100 });

      expect(productService.getAdminPage).toHaveBeenCalledWith({ page: 1, limit: 20, q: "arroz" });
      expect(orderService.getPageAdmin).toHaveBeenCalledWith({ page: 1, limit: 20, q: "arroz" });
      expect(customerService.getPage).toHaveBeenCalledWith({ page: 1, limit: 20, q: "arroz" });
    });

    it("si un service falla, propaga el error", async () => {
      (productService.getAdminPage as jest.Mock).mockRejectedValue(new Error("boom"));

      await expect(adminSearchService.search({ q: "arroz" })).rejects.toThrow("boom");
    });
  });
});
