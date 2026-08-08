import request from "supertest";
import searchRoutes from "../../../src/modules/search/routes/search.routes";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeProduct } from "../factories/product.factory";
import { createTestApp, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/search/services/search.service", () =>
  require("../mocks/repositories").mockSearchService
);

import { mockSearchService } from "../mocks/repositories";

const app = createTestApp("/api/search", searchRoutes);

describe("search.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca sin categoría y responde 200", async () => {
    const results = [makeProduct()];
    mockSearchService.search.mockResolvedValue(results);

    const res = await request(app).get("/api/search").query({ q: "arroz" });

    expect(mockSearchService.search).toHaveBeenCalledWith("arroz", undefined, undefined);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: toJson(results) });
  });

  it("busca con categoría y responde 200", async () => {
    mockSearchService.search.mockResolvedValue([]);

    const res = await request(app).get("/api/search").query({ q: "arroz", category: "granos" });

    expect(mockSearchService.search).toHaveBeenCalledWith("arroz", "granos", undefined);
    expect(res.status).toBe(200);
  });

  it("propaga el lang de la consulta al servicio", async () => {
    mockSearchService.search.mockResolvedValue([]);

    const res = await request(app).get("/api/search").query({ q: "arroz", lang: "en" });

    expect(mockSearchService.search).toHaveBeenCalledWith("arroz", undefined, "en");
    expect(res.status).toBe(200);
  });

  it("responde 400 si el término de búsqueda falta o es inválido", async () => {
    mockSearchService.search.mockRejectedValue(new InvalidDataError("Search term is required"));

    const res = await request(app).get("/api/search");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Search term is required");
  });
});
