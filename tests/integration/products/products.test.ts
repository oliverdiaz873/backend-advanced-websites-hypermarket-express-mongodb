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
