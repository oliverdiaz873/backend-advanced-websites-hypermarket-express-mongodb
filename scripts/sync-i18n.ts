import fs from "fs";
import path from "path";
import productsData from "../src/modules/products/data/products.data";

/**
 * Generador de traducciones EN del catálogo (F3).
 *
 * El backend NO depende en runtime de los repositorios storefront, pero sí
 * necesita las traducciones EN de los productos. Este script lee los `en.json`
 * de AMBOS storefronts (Angular y Next.js), verifica que coinciden y que son
 * 184/184 frente a la seed, y emite
 * `src/modules/products/data/products.i18n.data.ts` de forma determinista.
 *
 * Uso: npm run sync:i18n
 */

const ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(ROOT, "src", "modules", "products", "data", "products.i18n.data.ts");
const ANGULAR_EN = path.join(
  ROOT,
  "..",
  "pre-advanced-websites-hypermarket-angular",
  "src",
  "assets",
  "i18n",
  "en.json"
);
const NEXT_EN = path.join(ROOT, "..", "pre-advanced-websites-hypermarket-next", "messages", "en.json");

interface I18nProduct {
  name: string;
  description: string;
}

const productIds = productsData.map((p) => p.id);

const readCatalog = (file: string): Map<string, I18nProduct> => {
  if (!fs.existsSync(file)) {
    throw new Error(`No existe el archivo i18n EN del storefront: ${file}`);
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { products?: Record<string, Partial<I18nProduct>> };
  const map = new Map<string, I18nProduct>();
  for (const [id, entry] of Object.entries(raw.products ?? {})) {
    if (id === "_documentation") continue;
    map.set(id, {
      name: entry.name?.trim() ?? "",
      description: entry.description?.trim() ?? "",
    });
  }
  return map;
};

const coverage = (source: Map<string, I18nProduct>): { missing: string[]; extra: string[] } => {
  const missing = productIds.filter((id) => !source.has(id));
  const extra = [...source.keys()].filter((id) => !productIds.includes(id));
  return { missing, extra };
};

const fail = (message: string): never => {
  console.error(`[sync-i18n] ERROR: ${message}`);
  process.exit(1);
};

const main = (): void => {
  const angular = readCatalog(ANGULAR_EN);
  const next = readCatalog(NEXT_EN);

  for (const [label, source] of [
    ["Angular", angular],
    ["Next.js", next],
  ] as const) {
    const { missing, extra } = coverage(source);
    if (missing.length || extra.length) {
      fail(
        `${label}: cobertura rota frente a la seed (faltan ${missing.length}, hay ${extra.length} extra). ` +
          `missing=${JSON.stringify(missing)} extra=${JSON.stringify(extra)}`
      );
    }
  }

  const drift: string[] = [];
  for (const id of productIds) {
    const a = angular.get(id)!;
    const n = next.get(id)!;
    if (a.name !== n.name || a.description !== n.description) drift.push(id);
  }
  if (drift.length > 0) {
    fail(`Angular y Next.js no coinciden en ${drift.length} productos: ${JSON.stringify(drift)}`);
  }

  for (const id of productIds) {
    const entry = angular.get(id)!;
    if (!entry.name) fail(`Producto ${id}: falta name EN`);
    if (!entry.description) fail(`Producto ${id}: falta description EN`);
  }

  const sorted = [...productIds].sort();
  const lines: string[] = [
    "/**",
    " * Traducciones EN del catálogo (F3).",
    " * Generado por: npm run sync:i18n. NO editar manualmente.",
    ` * Fuente: Angular + Next.js en.json (${productIds.length} ids, verificados idénticos).`,
    " */",
    "",
    "interface ProductTranslationEntry {",
    "  name: string;",
    "  description: string;",
    "}",
    "",
    "export const productsI18nEn: Record<string, ProductTranslationEntry> = {",
  ];
  for (const id of sorted) {
    const entry = angular.get(id)!;
    lines.push(
      `  ${JSON.stringify(id)}: { name: ${JSON.stringify(entry.name)}, description: ${JSON.stringify(entry.description)} },`
    );
  }
  lines.push("};", "");

  fs.writeFileSync(OUT_FILE, lines.join("\n"));
  console.log(`[sync-i18n] OK: ${sorted.length} productos EN escritos en ${OUT_FILE}`);
};

main();