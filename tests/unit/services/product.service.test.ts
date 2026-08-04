import * as productService from "../../../src/modules/products/services/product.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { makeProduct, PRODUCT_ID } from "../factories/product.factory";
import { makeCategory, CATEGORY_ID } from "../factories/category.factory";
import { makeBrand, BRAND_ID } from "../factories/brand.factory";

jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);
jest.mock("../../../src/modules/categories/repositories/category.repository", () =>
  require("../mocks/repositories").mockCategoryRepository
);
jest.mock("../../../src/modules/brands/repositories/brand.repository", () =>
  require("../mocks/repositories").mockBrandRepository
);
jest.mock("../../../src/modules/inventory/services/inventory.service", () =>
  require("../mocks/repositories").mockInventoryService
);

import {
  mockProductRepository,
  mockCategoryRepository,
  mockBrandRepository,
  mockInventoryService,
} from "../mocks/repositories";

describe("product.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("retorna todos los productos", async () => {
      const products = [makeProduct()];
      mockProductRepository.findAll.mockResolvedValue(products);

      const result = await productService.getAll();

      expect(mockProductRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(products);
    });
  });

  describe("getPage", () => {
    it("normaliza la consulta y delega en findPage", async () => {
      const products = [makeProduct()];
      mockProductRepository.findPage.mockResolvedValue({
        items: products,
        total: 1,
        pagination: { page: 2, limit: 10, total: 1, pages: 1 },
      });

      const result = await productService.getPage({
        page: "2",
        limit: "10",
        q: "arroz",
        category: "Granos",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(mockProductRepository.findPage).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        q: "arroz",
        category: "Granos",
        brand: undefined,
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
      });
      expect(result).toEqual({ data: products, pagination: { page: 2, limit: 10, total: 1, pages: 1 } });
    });

    it("aplica defaults cuando faltan page, limit y sort", async () => {
      mockProductRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 50, total: 0, pages: 1 },
      });

      await productService.getPage({});

      expect(mockProductRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        q: undefined,
        category: undefined,
        brand: undefined,
        status: undefined,
        sortBy: undefined,
        sortOrder: "desc",
      });
    });

    it("descarta valores inválidos de page, limit, status y sortBy", async () => {
      mockProductRepository.findPage.mockResolvedValue({
        items: [],
        total: 0,
        pagination: { page: 1, limit: 50, total: 0, pages: 1 },
      });

      await productService.getPage({
        page: "abc",
        limit: "100000",
        status: "hacked",
        sortBy: "evil",
        sortOrder: "sideways",
      });

      expect(mockProductRepository.findPage).toHaveBeenCalledWith({
        page: 1,
        limit: 100,
        q: undefined,
        category: undefined,
        brand: undefined,
        status: undefined,
        sortBy: undefined,
        sortOrder: "desc",
      });
    });
  });

  describe("getById", () => {
    it("retorna el producto si existe", async () => {
      const product = makeProduct();
      mockProductRepository.findById.mockResolvedValue(product);

      const result = await productService.getById(PRODUCT_ID);

      expect(mockProductRepository.findById).toHaveBeenCalledWith(PRODUCT_ID);
      expect(result).toEqual(product);
    });

    it("lanza NotFoundError si el producto no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.getById(PRODUCT_ID)).rejects.toThrow(NotFoundError);
      await expect(productService.getById(PRODUCT_ID)).rejects.toThrow("Product not found");
    });
  });

  describe("create", () => {
    const base = { name: "Arroz 1kg", price: 89.5, image: "https://example.com/arroz.png", categoryId: CATEGORY_ID };

    it("crea el producto con sku generado y crea inventario en cascada", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockProductRepository.create.mockResolvedValue(makeProduct());
      mockInventoryService.createForProduct.mockResolvedValue({ productId: PRODUCT_ID, stock: 0 });

      const result = await productService.create({ ...base, stock: 15, minStock: 5 });

      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.any(String),
          sku: expect.stringContaining("arroz-1kg"),
          name: "Arroz 1kg",
          categoryId: CATEGORY_ID,
          category: { name: "Bebidas", slug: "bebidas" },
          status: "active",
          isAvailable: true,
        })
      );
      expect(mockInventoryService.createForProduct).toHaveBeenCalledWith({
        productId: PRODUCT_ID,
        stock: 15,
        minStock: 5,
      });
      expect(result).toEqual(makeProduct());
    });

    it("usa el sku provisto y resuelve el embed de marca", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockBrandRepository.findById.mockResolvedValue(makeBrand());
      mockProductRepository.create.mockResolvedValue(makeProduct({ brandId: BRAND_ID, brand: { name: "Coca-Cola", slug: "coca-cola" } }));

      await productService.create({ ...base, sku: "SKU-ALFA", brandId: BRAND_ID });

      expect(mockProductRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: "SKU-ALFA",
          brandId: BRAND_ID,
          brand: { name: "Coca-Cola", slug: "coca-cola" },
        })
      );
    });

    it("lanza InvalidDataError si falta el nombre", async () => {
      await expect(productService.create({ ...base, name: "" })).rejects.toThrow(InvalidDataError);
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si el precio es negativo", async () => {
      await expect(productService.create({ ...base, price: -1 })).rejects.toThrow(InvalidDataError);
    });

    it("lanza InvalidDataError si falta la imagen", async () => {
      await expect(productService.create({ ...base, image: "" })).rejects.toThrow(InvalidDataError);
    });

    it("lanza NotFoundError si la categoría no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(productService.create(base)).rejects.toThrow(NotFoundError);
      await expect(productService.create(base)).rejects.toThrow("Category not found");
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });

    it("lanza NotFoundError si la marca no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockBrandRepository.findById.mockResolvedValue(null);

      await expect(productService.create({ ...base, brandId: BRAND_ID })).rejects.toThrow(NotFoundError);
      await expect(productService.create({ ...base, brandId: BRAND_ID })).rejects.toThrow("Brand not found");
    });

    it("lanza ConflictError si el sku ya existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockProductRepository.findBySku.mockResolvedValue(makeProduct());

      await expect(productService.create({ ...base, sku: "SKU-ALFA" })).rejects.toThrow(ConflictError);
      await expect(productService.create({ ...base, sku: "SKU-ALFA" })).rejects.toThrow(
        "Product sku already exists: SKU-ALFA"
      );
      expect(mockProductRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("updateById", () => {
    it("actualiza los campos permitidos", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockProductRepository.updateById.mockResolvedValue(makeProduct({ name: "Arroz Premium" }));

      const result = await productService.updateById(PRODUCT_ID, { name: "Arroz Premium" });

      expect(mockProductRepository.updateById).toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ name: "Arroz Premium", updatedAt: expect.any(Date) }),
        { unset: [] }
      );
      expect(result).toEqual(makeProduct({ name: "Arroz Premium" }));
    });

    it("lanza NotFoundError si el producto no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.updateById(PRODUCT_ID, { name: "X" })).rejects.toThrow(NotFoundError);
    });

    it("lanza InvalidDataError si el nombre queda vacío", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());

      await expect(productService.updateById(PRODUCT_ID, { name: "  " })).rejects.toThrow(InvalidDataError);
    });

    it("lanza ConflictError si el sku ya pertenece a otro producto", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockProductRepository.findBySku.mockResolvedValue(makeProduct({ id: "otro-id", sku: "SKU-ALFA" }));

      await expect(productService.updateById(PRODUCT_ID, { sku: "SKU-ALFA" })).rejects.toThrow(ConflictError);
    });

    it("re-sincroniza el embed de categoría al cambiar categoryId", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockCategoryRepository.findById.mockResolvedValue(makeCategory({ name: "Granos", slug: "granos" }));
      mockProductRepository.updateById.mockResolvedValue(
        makeProduct({ categoryId: CATEGORY_ID, category: { name: "Granos", slug: "granos" } })
      );

      await productService.updateById(PRODUCT_ID, { categoryId: CATEGORY_ID });

      expect(mockProductRepository.updateById).toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ categoryId: CATEGORY_ID, category: { name: "Granos", slug: "granos" } }),
        { unset: [] }
      );
    });

    it("quita la marca cuando brandId es null", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct({ brandId: BRAND_ID, brand: { name: "Coca-Cola", slug: "coca-cola" } }));
      mockProductRepository.updateById.mockResolvedValue(makeProduct({ brandId: undefined, brand: undefined }));

      await productService.updateById(PRODUCT_ID, { brandId: null });

      expect(mockProductRepository.updateById).toHaveBeenCalledWith(
        PRODUCT_ID,
        expect.objectContaining({ updatedAt: expect.any(Date) }),
        { unset: ["brandId", "brand"] }
      );
    });
  });

  describe("remove", () => {
    it("borra el producto y su inventario", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockProductRepository.deleteById.mockResolvedValue(true);
      mockInventoryService.removeByProductId.mockResolvedValue(undefined);

      await expect(productService.remove(PRODUCT_ID)).resolves.toBeUndefined();

      expect(mockProductRepository.deleteById).toHaveBeenCalledWith(PRODUCT_ID);
      expect(mockInventoryService.removeByProductId).toHaveBeenCalledWith(PRODUCT_ID);
    });

    it("continúa aunque el inventario no exista (idempotente)", async () => {
      mockProductRepository.findById.mockResolvedValue(makeProduct());
      mockProductRepository.deleteById.mockResolvedValue(true);
      mockInventoryService.removeByProductId.mockResolvedValue(undefined);

      await expect(productService.remove(PRODUCT_ID)).resolves.toBeUndefined();
    });

    it("lanza NotFoundError si el producto no existe", async () => {
      mockProductRepository.findById.mockResolvedValue(null);

      await expect(productService.remove(PRODUCT_ID)).rejects.toThrow(NotFoundError);
      expect(mockProductRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
