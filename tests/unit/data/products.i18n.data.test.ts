import { productsI18nEn } from "../../../src/modules/products/data/products.i18n.data";
import productsData from "../../../src/modules/products/data/products.data";

describe("products.i18n.data (F3)", () => {
  it("cubre exactamente los 184 productos de la seed (sin missing ni extra)", () => {
    const seedIds = productsData.map((p) => p.id);
    const i18nIds = Object.keys(productsI18nEn);

    expect(i18nIds).toHaveLength(seedIds.length);
    expect(i18nIds.length).toBe(184);

    const sortedSeed = [...seedIds].sort();
    const sortedI18n = [...i18nIds].sort();
    expect(sortedI18n).toEqual(sortedSeed);
  });

  it("expone name y description EN no vacíos para cada producto", () => {
    for (const id of Object.keys(productsI18nEn)) {
      const entry = productsI18nEn[id];
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.name.trim()).toBe(entry.name);
      expect(entry.description.trim()).toBe(entry.description);
    }
  });

  it("se mantiene ordenado deterministicamente por id", () => {
    const ids = Object.keys(productsI18nEn);
    expect(ids).toEqual([...ids].sort());
  });
});