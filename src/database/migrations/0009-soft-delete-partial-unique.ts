import type { Migration } from "./types";

/**
 * E6.1.1 - Soft-delete con índices únicos parciales.
 *
 * El plugin de soft-delete añade `isDeleted/deletedAt` y filtra por defecto los
 * documentos borrados. Los índices únicos simples (sku_1/name_1/slug_1) seguirían
 * bloqueando la reutilización de un sku/name/slug tras un soft-delete, así que se
 * convierten en índices únicos PARCIALES (solo cuentan documentos activos).
 */

const PARTIAL_OPTIONS = {
  unique: true,
  partialFilterExpression: { isDeleted: { $eq: false } },
} as const;

interface PartialIndex {
  name: string;
  field: Record<string, 1>;
}

interface CollectionEntry {
  collection: string;
  /** Índices únicos simples a eliminar (los crea mongoose con `unique: true` a nivel de campo). */
  simple: string[];
  /** Índices únicos parciales a crear. */
  partial: PartialIndex[];
}

const SIMPLE_FIELDS: Record<string, Record<string, 1>> = {
  sku_1: { sku: 1 },
  name_1: { name: 1 },
  slug_1: { slug: 1 },
};

const CATALOG_COLLECTIONS: CollectionEntry[] = [
  {
    collection: "products",
    simple: ["sku_1"],
    partial: [{ name: "sku_partial_unique", field: { sku: 1 } }],
  },
  {
    collection: "brands",
    simple: ["name_1", "slug_1"],
    partial: [
      { name: "name_partial_unique", field: { name: 1 } },
      { name: "slug_partial_unique", field: { slug: 1 } },
    ],
  },
  {
    collection: "categories",
    simple: ["name_1", "slug_1"],
    partial: [
      { name: "name_partial_unique", field: { name: 1 } },
      { name: "slug_partial_unique", field: { slug: 1 } },
    ],
  },
];

const normalizeSoftDeleteFlags = (db: import("mongodb").Db, collectionName: string): Promise<import("mongodb").UpdateResult> => {
  const col = db.collection(collectionName);
  return col.updateMany(
    { $or: [{ isDeleted: { $exists: false } }, { isDeleted: null }] },
    { $set: { isDeleted: false, deletedAt: null } }
  );
};

export const up = async (db: import("mongodb").Db): Promise<void> => {
  for (const entry of CATALOG_COLLECTIONS) {
    const col = db.collection(entry.collection);

    // 1) Normalización: los documentos sin flag (o con null) pasan a isDeleted=false.
    //    Los ya soft-deleted (isDeleted=true) se conservan.
    await normalizeSoftDeleteFlags(db, entry.collection);

    // 2) Drop de los índices únicos simples existentes.
    for (const indexName of entry.simple) {
      await col.dropIndex(indexName).catch(() => undefined);
    }

    // 3) Índices únicos parciales (solo activos).
    for (const { name, field } of entry.partial) {
      await col.createIndex(field, { ...PARTIAL_OPTIONS, name });
    }
  }
};

export const down = async (db: import("mongodb").Db): Promise<void> => {
  for (const entry of CATALOG_COLLECTIONS) {
    const col = db.collection(entry.collection);

    for (const { name } of entry.partial) {
      await col.dropIndex(name).catch(() => undefined);
    }

    for (const indexName of entry.simple) {
      const field = SIMPLE_FIELDS[indexName];
      if (field) {
        await col.createIndex(field, { unique: true, name: indexName });
      }
    }
  }
};

const migration: Migration = {
  version: 9,
  name: "soft-delete-partial-unique",
  up,
  down,
};

export default migration;