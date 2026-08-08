import {
  buildProductImageKey,
  buildPendingKey,
  isAllowedImageMime,
  isAllowedImageExtension,
  extensionMatchesContentType,
  isSafeStorageKey,
  isSafeStoragePrefix,
  isSafeProductId,
  sniffImageMagicBytes,
  defaultExtensionForContentType,
} from "../../../src/shared/storage/uploads.constants";

describe("uploads.constants", () => {
  describe("buildProductImageKey", () => {
    it("genera una clave versionada única bajo products/{id}/", () => {
      const key = buildProductImageKey("8f3a-1234", "webp");
      expect(key).toMatch(/^products\/8f3a-1234\/[0-9a-f-]{36}\.webp$/);
    });

    it("normaliza la extensión a minúsculas", () => {
      expect(buildProductImageKey("8f3a", "WEBP")).toMatch(/\.webp$/);
    });

    it("genera claves distintas en cada llamada", () => {
      const a = buildProductImageKey("8f3a", "png");
      const b = buildProductImageKey("8f3a", "png");
      expect(a).not.toBe(b);
    });
  });

  describe("buildPendingKey", () => {
    it("genera una clave aleatoria bajo pending/", () => {
      const key = buildPendingKey("png");
      expect(key).toMatch(/^pending\/[0-9a-f-]{36}\.png$/);
    });
  });

  describe("isAllowedImageMime", () => {
    it("acepta los MIME permitidos", () => {
      for (const mime of ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]) {
        expect(isAllowedImageMime(mime)).toBe(true);
      }
    });

    it("rechaza MIME no permitidos", () => {
      expect(isAllowedImageMime("text/html")).toBe(false);
      expect(isAllowedImageMime("application/pdf")).toBe(false);
      expect(isAllowedImageMime("image/svg+xml")).toBe(false);
    });
  });

  describe("extensiones", () => {
    it("valida extensiones permitidas", () => {
      expect(isAllowedImageExtension("jpg")).toBe(true);
      expect(isAllowedImageExtension("JPEG")).toBe(true);
      expect(isAllowedImageExtension("webp")).toBe(true);
      expect(isAllowedImageExtension("exe")).toBe(false);
    });

    it("hace match entre MIME y extensión", () => {
      expect(extensionMatchesContentType("image/webp", "webp")).toBe(true);
      expect(extensionMatchesContentType("image/webp", "png")).toBe(false);
      expect(extensionMatchesContentType("image/jpeg", "jpg")).toBe(true);
      expect(extensionMatchesContentType("image/png", "jpeg")).toBe(false);
    });
  });

  describe("isSafeStorageKey", () => {
    it("acepta claves válidas", () => {
      expect(isSafeStorageKey("products/abc-123/original.webp")).toBe(true);
      expect(isSafeStorageKey("products/abc-123/8f3a-5678.webp")).toBe(true);
      expect(isSafeStorageKey("pending/8f3a-1234.png")).toBe(true);
    });

    it("rechaza path traversal y rutas absolutas", () => {
      expect(isSafeStorageKey("../secret.png")).toBe(false);
      expect(isSafeStorageKey("products/../x.png")).toBe(false);
      expect(isSafeStorageKey("C:\\Users\\x\\file.png")).toBe(false);
      expect(isSafeStorageKey("a/b/c/file.png")).toBe(false);
    });

    it("rechaza segmentos `.`/`..`, vacíos, absolutos y encoding (P1-3)", () => {
      const unsafe = [
        "products/8f3a/..",
        "products/8f3a/../",
        "products/8f3a/.",
        "products/8f3a/./x.webp",
        "products/../",
        "products/8f3a/../../evil",
        "pending/..",
        "products//x.webp",
        "products/8f3a//x.webp",
        "./evil",
        ".",
        "..",
        "products/",
        "/absolute/path.webp",
        "C:\\absolute\\path.webp",
        "..\\evil",
        "products\\x.webp",
        "pending/%2e%2e/x.webp",
        "products/8f3a/%2e%2e",
        "products/8f3a/file\x00.webp",
        "products/8f3a/file\x00.webp",
        "products/8f3a/....webp",
      ];
      for (const key of unsafe) {
        expect(isSafeStorageKey(key)).toBe(false);
      }
    });

    it("sigue aceptando keys versionadas válidas", () => {
      expect(isSafeStorageKey("products/8f3a-1234/68f1-x9.webp")).toBe(true);
      expect(isSafeStorageKey("pending/e3c2-4f7b.png")).toBe(true);
    });
  });

  describe("isSafeStoragePrefix", () => {
    it("acepta prefijos de directorio raíz y de producto", () => {
      expect(isSafeStoragePrefix("products")).toBe(true);
      expect(isSafeStoragePrefix("pending")).toBe(true);
      expect(isSafeStoragePrefix("products/8f3a-1234")).toBe(true);
      expect(isSafeStoragePrefix("products/8f3a-1234/")).toBe(true);
    });

    it("rechaza prefijos inseguros", () => {
      expect(isSafeStoragePrefix("")).toBe(false);
      expect(isSafeStoragePrefix("../products")).toBe(false);
      expect(isSafeStoragePrefix("products/../../x")).toBe(false);
    });

    it("rechaza prefijos con segmentos `.`/`..`, absolutos y encoding (P1-3)", () => {
      const unsafe = [
        "products/..",
        "products/../",
        "products/8f3a/..",
        "pending/..",
        "products/8f3a/.",
        "products//x",
        "products/8f3a//x",
        "..",
        ".",
        "/absolute",
        "C:\\x",
        "..\\products",
        "products/%2e%2e",
        "products/8f3a/%2e%2e",
      ];
      for (const prefix of unsafe) {
        expect(isSafeStoragePrefix(prefix)).toBe(false);
      }
    });
  });

  describe("isSafeProductId", () => {
    it("acepta UUIDs y slugs legacy", () => {
      expect(isSafeProductId("8f3a-1234-abcd")).toBe(true);
      expect(isSafeProductId("lacteos")).toBe(true);
    });

    it("rechaza ids con caracteres peligrosos o demasiado largos", () => {
      expect(isSafeProductId("../etc/passwd")).toBe(false);
      expect(isSafeProductId("a".repeat(200))).toBe(false);
    });
  });

  describe("sniffImageMagicBytes", () => {
    const padded = (prefix: Buffer): Buffer => Buffer.concat([prefix, Buffer.alloc(Math.max(0, 12 - prefix.length))]);

    it("detecta jpeg, png, webp, gif y avif", () => {
      expect(sniffImageMagicBytes(padded(Buffer.from([0xff, 0xd8, 0xff, 0xe0])))).toBe(true);
      expect(sniffImageMagicBytes(padded(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))).toBe(true);
      expect(sniffImageMagicBytes(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]))).toBe(true);
      expect(sniffImageMagicBytes(padded(Buffer.from("GIF89a")))).toBe(true);
      const avif = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.from("avif")]);
      expect(sniffImageMagicBytes(avif)).toBe(true);
    });

    it("rechaza buffers demasiado cortos o con contenido no imagen", () => {
      expect(sniffImageMagicBytes(Buffer.from("xx"))).toBe(false);
      expect(sniffImageMagicBytes(Buffer.from("<html>"))).toBe(false);
    });
  });

  describe("defaultExtensionForContentType", () => {
    it("devuelve la extensión por defecto del MIME", () => {
      expect(defaultExtensionForContentType("image/webp")).toBe("webp");
      expect(defaultExtensionForContentType("image/jpeg")).toBe("jpg");
      expect(defaultExtensionForContentType("text/html")).toBeUndefined();
    });
  });
});
