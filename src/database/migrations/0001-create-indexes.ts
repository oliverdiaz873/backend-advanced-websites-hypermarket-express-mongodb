import type { Migration } from "./types";

export const up = async (db: import("mongodb").Db): Promise<void> => {
  const collections = db.collections.bind(db);

  const products = await collections().then((all) => all.find((c) => c.collectionName === "products"));
  if (products) {
    await products.createIndex({ categoryId: 1 });
    await products.createIndex({ brandId: 1 });
    await products.createIndex({ sku: 1 }, { unique: true });
    await products.createIndex({ name: "text" });
  }

  const orders = await collections().then((all) => all.find((c) => c.collectionName === "orders"));
  if (orders) {
    await orders.createIndex({ userId: 1, createdAt: -1 });
    await orders.createIndex({ status: 1 });
  }

  const inventory = await collections().then((all) => all.find((c) => c.collectionName === "inventory"));
  if (inventory) {
    await inventory.createIndex({ productId: 1 }, { unique: true });
  }

  const auditlogs = await collections().then((all) => all.find((c) => c.collectionName === "auditlogs"));
  if (auditlogs) {
    await auditlogs.createIndex({ resource: 1, resourceId: 1 });
    await auditlogs.createIndex({ createdAt: -1 });
  }

  const users = await collections().then((all) => all.find((c) => c.collectionName === "users"));
  if (users) {
    await users.createIndex({ email: 1 }, { unique: true });
  }
};

export const down = async (db: import("mongodb").Db): Promise<void> => {
  const collections = await db.collections();
  const indexNames: Record<string, string[]> = {
    products: ["categoryId_1", "brandId_1", "sku_1", "name_text"],
    orders: ["userId_1_createdAt_-1", "status_1"],
    inventory: ["productId_1"],
    auditlogs: ["resource_1_resourceId_1", "createdAt_-1"],
    users: ["email_1"],
  };

  for (const col of collections) {
    const names = indexNames[col.collectionName];
    if (!names) continue;
    for (const name of names) {
      await col.dropIndex(name).catch(() => undefined);
    }
  }
};

const migration: Migration = {
  version: 1,
  name: "create-indexes",
  up,
  down,
};

export default migration;
