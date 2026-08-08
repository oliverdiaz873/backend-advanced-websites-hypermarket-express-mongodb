import type { Migration } from "./types";
import type { Db } from "mongodb";

/**
 * Añade los campos opcionales de imagen y traducciones al catálogo (F1):
 * - imageKey / imageThumbnailKey: referencias internas de storage.
 * - translations: { es, en } con name/description localizados.
 *
 * Los campos son opcionales, por lo que los documentos existentes siguen
 * siendo válidos sin migración de datos. `up` queda como marcador de versión;
 * `down` revierte los campos (rollback de F1).
 */
const migration: Migration = {
  version: 4,
  name: "add-product-image-fields",
  up: async (_db: Db) => {
    // No-op: Mongoose modela los campos opcionales; no se alteran datos.
  },
  down: async (db: Db) => {
    await db.collection("products").updateMany(
      {},
      { $unset: { imageKey: 1, imageThumbnailKey: 1, translations: 1 } }
    );
  },
};

export default migration;
