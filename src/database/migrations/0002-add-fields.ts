import type { Migration } from "./types";

export const up = async (db: import("mongodb").Db): Promise<void> => {
  const collections = await db.collections();
  const names = ["products", "categories", "brands", "offers", "users", "orders"];

  for (const col of collections) {
    if (!names.includes(col.collectionName)) continue;
    await col.updateMany({}, { $set: { isDeleted: false, deletedAt: null } });
  }
};

export const down = async (db: import("mongodb").Db): Promise<void> => {
  const collections = await db.collections();
  const names = ["products", "categories", "brands", "offers", "users", "orders"];

  for (const col of collections) {
    if (!names.includes(col.collectionName)) continue;
    await col.updateMany({}, { $unset: { isDeleted: "", deletedAt: "" } });
  }
};

const migration: Migration = {
  version: 2,
  name: "add-soft-delete-fields",
  up,
  down,
};

export default migration;
