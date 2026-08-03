import request from "supertest";
import app from "../../../src/app";
import { createTestProduct } from "../helpers/product.helper";

describe("E2E: /api/products", () => {
  it("GET / responde 200 con la lista de productos", async () => {
    const p1 = await createTestProduct({ name: "Arroz 1kg" });
    await createTestProduct({ name: "Fideos 500g" });

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((p: { id: string }) => p.id)).toContain(p1.id);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 50, total: 2, pages: 1 });
  });

  it("GET / respeta page y limit, y devuelve la paginación", async () => {
    await createTestProduct({ name: "Prod A" });
    await createTestProduct({ name: "Prod B" });
    await createTestProduct({ name: "Prod C" });

    const res = await request(app).get("/api/products?page=2&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });

  it("GET / filtra por estado y búsqueda", async () => {
    await createTestProduct({ name: "Te Activo", status: "active" });
    await createTestProduct({ name: "Café Inactivo", status: "inactive" });

    const inactiveOnly = await request(app).get("/api/products?status=inactive");
    expect(inactiveOnly.status).toBe(200);
    expect(inactiveOnly.body.data).toHaveLength(1);
    expect(inactiveOnly.body.data[0].name).toBe("Café Inactivo");

    const search = await request(app).get("/api/products?q=activo");
    expect(search.status).toBe(200);
    expect(search.body.data.length).toBeGreaterThan(0);
    expect(search.body.data.some((p: { name: string }) => p.name === "Te Activo")).toBe(true);
  });

  it("GET / ordena por nombre ascendente", async () => {
    await createTestProduct({ name: "Zanahoria" });
    await createTestProduct({ name: "Almendra" });

    const res = await request(app).get("/api/products?sortBy=name&sortOrder=asc");

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe("Almendra");
  });

  it("GET /:id responde 200 con el producto", async () => {
    const product = await createTestProduct();

    const res = await request(app).get(`/api/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: product.id, name: product.name, price: product.price });
  });

  it("GET /:id responde 404 si el producto no existe", async () => {
    const res = await request(app).get("/api/products/prod_inexistente");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });
});
