import * as productRepository from "../../../src/modules/products/repositories/product.repository";
import { createTestProduct } from "../helpers/product.helper";

describe("product.repository (Mongo real)", () => {
  it("findAll devuelve todos los productos", async () => {
    await createTestProduct();
    await createTestProduct();

    const products = await productRepository.findAll();

    expect(products).toHaveLength(2);
  });

  it("findById devuelve el producto y null si no existe", async () => {
    const product = await createTestProduct();

    expect((await productRepository.findById(product.id))?.id).toBe(product.id);
    expect(await productRepository.findById("prod_inexistente")).toBeNull();
  });

  it("findByIds respeta el orden solicitado y omite inexistentes", async () => {
    const p1 = await createTestProduct();
    const p2 = await createTestProduct();
    await createTestProduct();

    const found = await productRepository.findByIds([p2.id, p1.id, "prod_inexistente"]);

    expect(found.map((p) => p.id)).toEqual([p2.id, p1.id]);
  });

  it("search por palabra única usa regex case-insensitive", async () => {
    await createTestProduct({ name: "Arroz 1kg" });

    const results = await productRepository.search("arroz");

    expect(results.map((p) => p.name)).toContain("Arroz 1kg");
  });

  it("search multi-palabra usa $text (tokens no contiguos)", async () => {
    await createTestProduct({ name: "Arroz Integral Premium" });

    const results = await productRepository.search("arroz premium");

    expect(results.map((p) => p.name)).toContain("Arroz Integral Premium");
  });

  it("search filtra por categoría (slug)", async () => {
    await createTestProduct({
      name: "Arroz 1kg",
      categoryId: "cat_granos",
      category: { name: "Granos", slug: "granos" },
    });

    const inCategory = await productRepository.search("arroz", "granos");
    const otherCategory = await productRepository.search("arroz", "bebidas");

    expect(inCategory).toHaveLength(1);
    expect(otherCategory).toHaveLength(0);
  });

  it("search sin coincidencias devuelve lista vacía", async () => {
    await createTestProduct({ name: "Arroz 1kg" });

    const results = await productRepository.search("inexistente");

    expect(results).toEqual([]);
  });
});
