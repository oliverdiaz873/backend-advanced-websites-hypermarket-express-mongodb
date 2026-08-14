import { toPublicProduct, normalizeLang } from "../../../src/modules/products/presenters/product.presenter";
import { makeProduct } from "../factories/product.factory";

jest.mock("../../../src/shared/storage/storage.factory", () => ({
  getStorageProvider: jest.fn(),
}));

describe("product.presenter - resolución de idioma (E6.1.2)", () => {
  describe("normalizeLang", () => {
    it("acepta solo es/en", () => {
      expect(normalizeLang("es")).toBe("es");
      expect(normalizeLang("en")).toBe("en");
      expect(normalizeLang(undefined)).toBeUndefined();
      expect(normalizeLang(null)).toBeUndefined();
      expect(normalizeLang("fr")).toBeUndefined();
      expect(normalizeLang("EN")).toBeUndefined();
      expect(normalizeLang("es-es")).toBeUndefined();
    });
  });

  describe("toPublicProduct", () => {
    const rootName = "Arroz 1kg";
    const rootDescription = "Arroz blanco premium";

    it("lang=en con translations.en devuelve EN", () => {
      const product = makeProduct({
        translations: { en: { name: "Rice 1kg", description: "White rice" } },
      });

      const result = toPublicProduct(product, "en");

      expect(result.name).toBe("Rice 1kg");
      expect(result.description).toBe("White rice");
    });

    it("lang=es con translations.es devuelve ES", () => {
      const product = makeProduct({
        translations: { es: { name: "Arroz (ES)", description: "Detalle ES" } },
      });

      const result = toPublicProduct(product, "es");

      expect(result.name).toBe("Arroz (ES)");
      expect(result.description).toBe("Detalle ES");
    });

    it("lang=undefined devuelve root (ES)", () => {
      const result = toPublicProduct(makeProduct({ translations: { en: { name: "Rice" } } }));

      expect(result.name).toBe(rootName);
      expect(result.description).toBe(rootDescription);
    });

    it("lang inválido (fr / EN / es-es) devuelve root (ES)", () => {
      const product = makeProduct({ translations: { en: { name: "Rice" } } });

      for (const invalid of ["fr", "EN", "es-es"]) {
        const result = toPublicProduct(product, normalizeLang(invalid));
        expect(result.name).toBe(rootName);
        expect(result.description).toBe(rootDescription);
      }
    });

    it("translations ausente devuelve root (ES)", () => {
      const result = toPublicProduct(makeProduct({ translations: undefined }));

      expect(result.name).toBe(rootName);
      expect(result.description).toBe(rootDescription);
    });

    it("translations.en ausente con lang=en devuelve root (ES)", () => {
      const result = toPublicProduct(makeProduct({ translations: { es: { name: "Arroz (ES)" } } }), "en");

      expect(result.name).toBe(rootName);
      expect(result.description).toBe(rootDescription);
    });

    it("translations.en con name pero sin description: name EN y description root", () => {
      const product = makeProduct({
        translations: { en: { name: "Rice 1kg" } },
      });

      const result = toPublicProduct(product, "en");

      expect(result.name).toBe("Rice 1kg");
      expect(result.description).toBe(rootDescription);
    });

    it("nunca expone el bloque translations en la salida pública", () => {
      const result = toPublicProduct(makeProduct({ translations: { en: { name: "Rice" } } }), "en");

      expect(result).not.toHaveProperty("translations");
    });
  });
});