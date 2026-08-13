import type { Migration } from "./types";
import type { Db } from "mongodb";

/**
 * Añade el flag `featured` a la colección `products` (E4.6):
 * - `featured`: marca el producto como destacado en los storefronts.
 *
 * Backward-compatible: solo rellena `featured: false` en los documentos que no
 * lo tienen (idempotente), crea el índice de listado de destacados y deja
 * intactos los productos ya destacados. `down` revierte el flag y el índice.
 */
const migration: Migration = {
  version: 7,
  name: "add-product-featured",
  up: async (db: Db) => {
    const products = db.collection("products");
    await products.updateMany(
      { featured: { $exists: false } },
      { $set: { featured: false } }
    );
    await products.createIndex({ featured: 1 });
  },
  down: async (db: Db) => {
    const products = db.collection("products");
    await products.dropIndex("featured_1").catch(() => undefined);
    await products.updateMany({}, { $unset: { featured: 1 } });
  },
};

export default migration;
