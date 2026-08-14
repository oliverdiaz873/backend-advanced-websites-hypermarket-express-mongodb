import * as brandService from "../../../src/modules/brands/services/brand.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { ConflictError } from "../../../src/shared/errors/conflict.error";
import { makeBrand, BRAND_ID } from "../factories/brand.factory";

jest.mock("../../../src/modules/brands/repositories/brand.repository", () =>
  require("../mocks/repositories").mockBrandRepository
);
jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);

import { mockBrandRepository, mockProductRepository } from "../mocks/repositories";

describe("brand.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("retorna todas las marcas", async () => {
      const brands = [makeBrand()];
      mockBrandRepository.findAll.mockResolvedValue(brands);

      const result = await brandService.getAll();

      expect(mockBrandRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(brands);
    });
  });

  describe("getById", () => {
    it("retorna la marca si existe", async () => {
      const brand = makeBrand();
      mockBrandRepository.findById.mockResolvedValue(brand);

      const result = await brandService.getById(BRAND_ID);

      expect(mockBrandRepository.findById).toHaveBeenCalledWith(BRAND_ID);
      expect(result).toEqual(brand);
    });

    it("lanza NotFoundError si no existe", async () => {
      mockBrandRepository.findById.mockResolvedValue(null);

      await expect(brandService.getById(BRAND_ID)).rejects.toThrow(NotFoundError);
      await expect(brandService.getById(BRAND_ID)).rejects.toThrow("Brand not found");
    });
  });

  describe("create", () => {
    it("crea la marca generando el slug desde el nombre", async () => {
      mockBrandRepository.findByName.mockResolvedValue(null);
      mockBrandRepository.findBySlug.mockResolvedValue(null);
      mockBrandRepository.create.mockResolvedValue(makeBrand());

      const result = await brandService.create({ name: "Coca-Cola" });

      expect(mockBrandRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ _id: expect.any(String), name: "Coca-Cola", slug: "coca-cola", status: "active" })
      );
      expect(result).toEqual(makeBrand());
    });

    it("lanza InvalidDataError si falta el nombre", async () => {
      await expect(brandService.create({ name: "" })).rejects.toThrow(InvalidDataError);
      expect(mockBrandRepository.create).not.toHaveBeenCalled();
    });

    it("lanza ConflictError si el nombre ya existe", async () => {
      mockBrandRepository.findByName.mockResolvedValue(makeBrand());

      await expect(brandService.create({ name: "Coca-Cola" })).rejects.toThrow(ConflictError);
      await expect(brandService.create({ name: "Coca-Cola" })).rejects.toThrow("Brand name already exists: Coca-Cola");
    });

    it("lanza ConflictError si el slug ya existe", async () => {
      mockBrandRepository.findByName.mockResolvedValue(null);
      mockBrandRepository.findBySlug.mockResolvedValue(makeBrand());

      await expect(brandService.create({ name: "Coca-Cola" })).rejects.toThrow(ConflictError);
      await expect(brandService.create({ name: "Coca-Cola" })).rejects.toThrow("Brand slug already exists: coca-cola");
    });
  });

  describe("updateById", () => {
    it("actualiza la marca y sincroniza los embeds de productos", async () => {
      mockBrandRepository.findById.mockResolvedValue(makeBrand());
      mockBrandRepository.updateById.mockResolvedValue(makeBrand({ name: "Coca-Cola Company", slug: "coca-cola-company" }));

      const result = await brandService.updateById(BRAND_ID, { name: "Coca-Cola Company" });

      expect(mockBrandRepository.updateById).toHaveBeenCalledWith(
        BRAND_ID,
        expect.objectContaining({ name: "Coca-Cola Company", updatedAt: expect.any(Date) })
      );
      expect(mockProductRepository.updateBrandEmbeds).toHaveBeenCalledWith(BRAND_ID, {
        name: "Coca-Cola Company",
        slug: "coca-cola-company",
      });
      expect(result).toEqual(makeBrand({ name: "Coca-Cola Company", slug: "coca-cola-company" }));
    });

    it("lanza NotFoundError si no existe", async () => {
      mockBrandRepository.findById.mockResolvedValue(null);

      await expect(brandService.updateById(BRAND_ID, { name: "X" })).rejects.toThrow(NotFoundError);
    });

    it("lanza ConflictError si el nombre duplicado pertenece a otra marca", async () => {
      mockBrandRepository.findById.mockResolvedValue(makeBrand());
      mockBrandRepository.findByName.mockResolvedValue(makeBrand({ id: "otra", name: "Coca-Cola" }));

      await expect(brandService.updateById(BRAND_ID, { name: "Coca-Cola" })).rejects.toThrow(ConflictError);
    });
  });

  describe("remove", () => {
    it("soft-borra la marca si no tiene productos referenciados", async () => {
      mockBrandRepository.findById.mockResolvedValue(makeBrand());
      mockProductRepository.existsByBrandId.mockResolvedValue(false);
      mockBrandRepository.softDeleteById.mockResolvedValue(true);

      await expect(brandService.remove(BRAND_ID)).resolves.toBeUndefined();
      expect(mockBrandRepository.softDeleteById).toHaveBeenCalledWith(BRAND_ID);
    });

    it("lanza ConflictError si tiene productos referenciados", async () => {
      mockBrandRepository.findById.mockResolvedValue(makeBrand());
      mockProductRepository.existsByBrandId.mockResolvedValue(true);

      await expect(brandService.remove(BRAND_ID)).rejects.toThrow(ConflictError);
      await expect(brandService.remove(BRAND_ID)).rejects.toThrow("Cannot delete brand with referenced products");
      expect(mockBrandRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it("lanza NotFoundError si no existe", async () => {
      mockBrandRepository.findById.mockResolvedValue(null);

      await expect(brandService.remove(BRAND_ID)).rejects.toThrow(NotFoundError);
      expect(mockBrandRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });

  describe("restore", () => {
    it("restaura la marca soft-borrada", async () => {
      mockBrandRepository.restoreById.mockResolvedValue(true);

      await expect(brandService.restore(BRAND_ID)).resolves.toBeUndefined();
      expect(mockBrandRepository.restoreById).toHaveBeenCalledWith(BRAND_ID);
    });

    it("lanza NotFoundError si la marca no existe (ni siquiera borrada)", async () => {
      mockBrandRepository.restoreById.mockResolvedValue(false);

      await expect(brandService.restore(BRAND_ID)).rejects.toThrow(NotFoundError);
    });
  });
});
