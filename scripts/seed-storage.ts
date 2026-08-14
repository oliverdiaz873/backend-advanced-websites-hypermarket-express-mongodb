import fs from "fs";
import path from "path";
import productsData from "../src/modules/products/data/products.data";

/**
 * Provisiona el storage local (development) con las imágenes del catálogo.
 *
 * La seed emite claves raw `products/<slug>/<file>.ext` y Express sirve
 * `/uploads` desde `storageLocalDir` (`/storage` por defecto). Los binarios
 * históricos viven en el repositorio de un storefront
 * (`public/assets/images/productos/**`), así que este script copia cada asset
 * a `<storage>/<image key>` de forma idempotente (no re-copia si ya existe).
 *
 * Uso:
 *   npm run seed:storage
 *
 * Opciones por env:
 *   STORAGE_LOCAL_DIR  -> destino (default: <repo>/storage)
 *   IMAGE_SOURCE_DIR   -> origen de assets (default: ../pre-advanced-websites-hypermarket-next/public/assets/images/productos)
 */
const ROOT = path.resolve(__dirname, "..");
const DEST_ROOT = process.env.STORAGE_LOCAL_DIR || path.join(ROOT, "storage");
const SOURCE = process.env.IMAGE_SOURCE_DIR || path.join(
  ROOT,
  "..",
  "pre-advanced-websites-hypermarket-next",
  "public",
  "assets",
  "images",
  "productos"
);

const collectByBasename = async (dir: string): Promise<Map<string, string[]>> => {
  const map = new Map<string, string[]>();
  const walk = async (current: string): Promise<void> => {
    const entries = await fs.promises.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const key = entry.name.toLowerCase();
        const list = map.get(key) ?? [];
        list.push(full);
        map.set(key, list);
      }
    }
  };
  await walk(dir);
  return map;
};

const main = async (): Promise<void> => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`[seed-storage] Origen no existe: ${SOURCE}`);
    process.exit(1);
  }

  const files = await collectByBasename(SOURCE);
  let copied = 0;
  let skipped = 0;
  let missing = 0;
  let collisions = 0;
  const missingList: string[] = [];

  for (const product of productsData) {
    const key = product.image;
    if (!key) continue;

    const dest = path.join(DEST_ROOT, key);
    if (fs.existsSync(dest)) {
      skipped++;
      continue;
    }

    const basename = path.basename(key).toLowerCase();
    const candidates = files.get(basename);
    if (!candidates || candidates.length === 0) {
      missing++;
      missingList.push(`${product.id} -> ${key}`);
      continue;
    }

    const keyDir = path.dirname(key).split(path.sep).join("/");
    const source =
      candidates.length === 1
        ? candidates[0]
        : candidates.find((c) => c.toLowerCase().includes(keyDir)) ?? candidates[0];
    if (candidates.length > 1) collisions++;

    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    await fs.promises.copyFile(source, dest);
    copied++;
  }

  console.log(`[seed-storage] Origen: ${SOURCE}`);
  console.log(`[seed-storage] Destino: ${DEST_ROOT}`);
  console.log(
    `[seed-storage] copiadas=${copied} omitidas(existentes)=${skipped} faltantes=${missing} colisionesBasename=${collisions}`
  );
  if (missingList.length > 0) {
    console.log(`[seed-storage] Faltantes (${missingList.length}):`);
    console.log(missingList.map((m) => `  - ${m}`).join("\n"));
  }
};

main().catch((err) => {
  console.error("[seed-storage] Error:", err);
  process.exit(1);
});
