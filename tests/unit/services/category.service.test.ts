import * as categoryService from "../../../src/modules/categories/services/category.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { makeCategory, CATEGORY_ID } from "../factories/category.factory";

jest.mock("../../../src/modules/categories/repositories/category.repository", () =>
  require("../mocks/repositories").mockCategoryRepository
);
jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);

import { mockCategoryRepository, mockProductRepository } from "../mocks/repositories";

describe("category.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("retorna todas las categorías", async () => {
      const categories = [makeCategory()];
      mockCategoryRepository.findAll.mockResolvedValue(categories);

      const result = await categoryService.getAll();

      expect(mockCategoryRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(categories);
    });
  });

  describe("getById", () => {
    it("retorna la categoría si existe", async () => {
      const category = makeCategory();
      mockCategoryRepository.findById.mockResolvedValue(category);

      const result = await categoryService.getById(CATEGORY_ID);

      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(CATEGORY_ID);
      expect(result).toEqual(category);
    });

    it("lanza NotFoundError si no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(categoryService.getById(CATEGORY_ID)).rejects.toThrow(NotFoundError);
      await expect(categoryService.getById(CATEGORY_ID)).rejects.toThrow("Category not found");
    });
  });

  describe("create", () => {
    it("crea la categoría generando el slug desde el nombre", async () => {
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.findBySlug.mockResolvedValue(null);
      mockCategoryRepository.create.mockResolvedValue(makeCategory());

      const result = await categoryService.create({ name: "Bebidas" });

      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expect.any(String), name: "Bebidas", slug: "bebidas", subcategories: [] })
      );
      expect(result).toEqual(makeCategory());
    });

    it("usa el slug provisto y mantiene las subcategorías", async () => {
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.findBySlug.mockResolvedValue(null);
      mockCategoryRepository.create.mockResolvedValue(makeCategory());

      await categoryService.create({
        name: "Bebidas",
        slug: "bebidas-2026",
        subcategories: [{ name: "Gaseosas", slug: "gaseosas" }],
      });

      expect(mockCategoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "bebidas-2026", subcategories: [{ name: "Gaseosas", slug: "gaseosas" }] })
      );
    });

    it("lanza InvalidDataError si falta el nombre", async () => {
      await expect(categoryService.create({ name: "" })).rejects.toThrow(InvalidDataError);
      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });

    it("lanza ConflictError si el nombre ya existe", async () => {
      mockCategoryRepository.findByName.mockResolvedValue(makeCategory());

      await expect(categoryService.create({ name: "Bebidas" })).rejects.toThrow(ConflictError);
      await expect(categoryService.create({ name: "Bebidas" })).rejects.toThrow("Category name already exists: Bebidas");
    });

    it("lanza ConflictError si el slug ya existe", async () => {
      mockCategoryRepository.findByName.mockResolvedValue(null);
      mockCategoryRepository.findBySlug.mockResolvedValue(makeCategory());

      await expect(categoryService.create({ name: "Bebidas" })).rejects.toThrow(ConflictError);
      await expect(categoryService.create({ name: "Bebidas" })).rejects.toThrow("Category slug already exists: bebidas");
    });
  });

  describe("updateById", () => {
    it("actualiza la categoría y sincroniza los embeds de productos", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockCategoryRepository.updateById.mockResolvedValue(makeCategory({ name: "Bebidas y refrescos", slug: "bebidas-refrescos" }));

      const result = await categoryService.updateById(CATEGORY_ID, { name: "Bebidas y refrescos" });

      expect(mockCategoryRepository.updateById).toHaveBeenCalledWith(
        CATEGORY_ID,
        expect.objectContaining({ name: "Bebidas y refrescos", updatedAt: expect.any(Date) })
      );
      expect(mockProductRepository.updateCategoryEmbeds).toHaveBeenCalledWith(CATEGORY_ID, {
        name: "Bebidas y refrescos",
        slug: "bebidas-refrescos",
      });
      expect(result).toEqual(makeCategory({ name: "Bebidas y refrescos", slug: "bebidas-refrescos" }));
    });

    it("lanza NotFoundError si no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(categoryService.updateById(CATEGORY_ID, { name: "X" })).rejects.toThrow(NotFoundError);
    });

    it("lanza ConflictError si el slug duplicado pertenece a otra categoría", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockCategoryRepository.findBySlug.mockResolvedValue(makeCategory({ id: "otra", slug: "bebidas" }));

      await expect(categoryService.updateById(CATEGORY_ID, { slug: "bebidas" })).rejects.toThrow(ConflictError);
    });

    it("lanza InvalidDataError si el slug queda vacío", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());

      await expect(categoryService.updateById(CATEGORY_ID, { slug: "  " })).rejects.toThrow(InvalidDataError);
    });
  });

  describe("remove", () => {
    it("soft-borra la categoría si no tiene productos referenciados", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockProductRepository.existsByCategoryId.mockResolvedValue(false);
      mockCategoryRepository.softDeleteById.mockResolvedValue(true);

      await expect(categoryService.remove(CATEGORY_ID)).resolves.toBeUndefined();
      expect(mockCategoryRepository.softDeleteById).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it("lanza ConflictError si tiene productos referenciados", async () => {
      mockCategoryRepository.findById.mockResolvedValue(makeCategory());
      mockProductRepository.existsByCategoryId.mockResolvedValue(true);

      await expect(categoryService.remove(CATEGORY_ID)).rejects.toThrow(ConflictError);
      await expect(categoryService.remove(CATEGORY_ID)).rejects.toThrow("Cannot delete category with referenced products");
      expect(mockCategoryRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it("lanza NotFoundError si no existe", async () => {
      mockCategoryRepository.findById.mockResolvedValue(null);

      await expect(categoryService.remove(CATEGORY_ID)).rejects.toThrow(NotFoundError);
      expect(mockCategoryRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });

  describe("restore", () => {
    it("restaura la categoría soft-borrada", async () => {
      mockCategoryRepository.restoreById.mockResolvedValue(true);

      await expect(categoryService.restore(CATEGORY_ID)).resolves.toBeUndefined();
      expect(mockCategoryRepository.restoreById).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it("lanza NotFoundError si la categoría no existe (ni siquiera borrada)", async () => {
      mockCategoryRepository.restoreById.mockResolvedValue(false);

      await expect(categoryService.restore(CATEGORY_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
