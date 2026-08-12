import type { Migration } from "./types";

export const up = async (db: import("mongodb").Db): Promise<void> => {
  const orders = db.collection("orders");
  await orders.createIndex(
    { userId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
  );
  await orders.createIndex(
    { orderNumber: 1 },
    { unique: true, partialFilterExpression: { orderNumber: { $type: "string" } } }
  );
};

export const down = async (db: import("mongodb").Db): Promise<void> => {
  const orders = db.collection("orders");
  await orders.dropIndex("userId_1_idempotencyKey_1").catch(() => undefined);
  await orders.dropIndex("orderNumber_1").catch(() => undefined);
};

const migration: Migration = {
  version: 5,
  name: "order-idempotency-and-order-number",
  up,
  down,
};

export default migration;