import * as searchService from "../../../src/modules/search/services/search.service";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { toPublicProduct } from "../../../src/modules/products/presenters/product.presenter";
import { makeProduct } from "../factories/product.factory";

jest.mock("../../../src/modules/products/repositories/product.repository", () =>
  require("../mocks/repositories").mockProductRepository
);

import { mockProductRepository } from "../mocks/repositories";

describe("search.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lanza InvalidDataError si el término de búsqueda está vacío", async () => {
    await expect(searchService.search("")).rejects.toThrow(InvalidDataError);
    await expect(searchService.search("")).rejects.toThrow("Search term is required");
    expect(mockProductRepository.search).not.toHaveBeenCalled();
  });

  it("lanza InvalidDataError si el término de búsqueda son solo espacios", async () => {
    await expect(searchService.search("   ")).rejects.toThrow(InvalidDataError);
    expect(mockProductRepository.search).not.toHaveBeenCalled();
  });

  it("busca productos con categoría y los mapea al shape público", async () => {
    const results = [makeProduct()];
    mockProductRepository.search.mockResolvedValue(results);

    const result = await searchService.search("arroz", "granos");

    expect(mockProductRepository.search).toHaveBeenCalledWith("arroz", "granos");
    expect(result).toEqual(results.map((product) => toPublicProduct(product)));
  });

  it("busca productos sin categoría", async () => {
    mockProductRepository.search.mockResolvedValue([]);

    const result = await searchService.search("arroz");

    expect(mockProductRepository.search).toHaveBeenCalledWith("arroz", undefined);
    expect(result).toEqual([]);
  });
});
