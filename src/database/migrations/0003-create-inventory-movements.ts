import type { Migration } from "./types";

const COLLECTION = "inventory_movements";

export const up = async (db: import("mongodb").Db): Promise<void> => {
  const collections = await db.collections();
  const exists = collections.some((c) => c.collectionName === COLLECTION);

  if (!exists) {
    await db.createCollection(COLLECTION);
  }

  const col = db.collection(COLLECTION);
  await col.createIndex({ inventoryId: 1, createdAt: -1 });
  await col.createIndex({ productId: 1, createdAt: -1 });
  await col.createIndex({ type: 1 });
};

export const down = async (db: import("mongodb").Db): Promise<void> => {
  const col = db.collection(COLLECTION);
  await col.dropIndex("inventoryId_1_createdAt_-1").catch(() => undefined);
  await col.dropIndex("productId_1_createdAt_-1").catch(() => undefined);
  await col.dropIndex("type_1").catch(() => undefined);
};

const migration: Migration = {
  version: 3,
  name: "create-inventory-movements",
  up,
  down,
};

export default migration;
