import { mapProduct } from "../../../src/database/seed.mapper";
import { productsI18nEn } from "../../../src/modules/products/data/products.i18n.data";
import productsData from "../../../src/modules/products/data/products.data";

const subcategoryNames: Record<string, string> = {
  bebidas: "Bebidas",
  "carnes-pescados-mariscos": "Carnes Pescados y Mariscos",
  despensa: "Despensa",
};

describe("mapProduct (F3)", () => {
  it("conserva los campos raíz en español y agrega translations.en sin tocar root", () => {
    const raw = productsData[0];
    const mapped = mapProduct(raw, subcategoryNames);

    expect(mapped.name).toBe(raw.name);
    expect(mapped.description).toBe(`Detalle de ${raw.name}`);
    expect(mapped.sku).toBe(`sku-${raw.id}`);
    expect(mapped.status).toBe("active");
    expect(mapped.isAvailable).toBe(true);

    const en = productsI18nEn[raw.id];
    expect(mapped.translations?.en).toEqual(en);
  });

  it("deja translations undefined cuando el producto no tiene entrada EN", () => {
    const mapped = mapProduct(
      { id: "producto_fantasma", name: "Fantasma", price: 1, image: "", category: "despensa" },
      subcategoryNames
    );
    expect(mapped.translations).toBeUndefined();
    expect(mapped.name).toBe("Fantasma");
  });

  it("aplica translations.en a todos los productos de la seed", () => {
    for (const raw of productsData) {
      const mapped = mapProduct(raw, subcategoryNames);
      expect(mapped.translations?.en?.name).toBeTruthy();
      expect(mapped.translations?.en?.description).toBeTruthy();
    }
  });
});