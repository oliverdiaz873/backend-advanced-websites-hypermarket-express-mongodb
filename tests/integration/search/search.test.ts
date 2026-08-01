import request from "supertest";
import app from "../../../src/app";
import { createTestProduct } from "../helpers/product.helper";

describe("E2E: /api/search", () => {
  it("GET /?q= busca y responde 200", async () => {
    await createTestProduct({ name: "Arroz 1kg" });
    await createTestProduct({ name: "Fideos 500g" });

    const res = await request(app).get("/api/search").query({ q: "arroz" });

    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).toContain("Arroz 1kg");
  });

  it("GET /?q=&category= filtra por categoría", async () => {
    await createTestProduct({
      name: "Arroz 1kg",
      category: { name: "Granos", slug: "granos" },
      categoryId: "cat_granos",
    });

    const res = await request(app).get("/api/search").query({ q: "arroz", category: "granos" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("responde 400 si falta el término de búsqueda", async () => {
    const res = await request(app).get("/api/search");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Search term is required");
  });

  it("responde 200 si no hay coincidencias", async () => {
    const res = await request(app).get("/api/search").query({ q: "inexistente" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
