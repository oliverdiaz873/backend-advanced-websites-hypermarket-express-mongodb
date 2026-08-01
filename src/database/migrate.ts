import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import type { Migration } from "./migrations/types";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const COLLECTION_NAME = "schema_migrations";

const getApplied = async (db: import("mongodb").Db): Promise<number[]> => {
  const collection = db.collection(COLLECTION_NAME);
  const docs = await collection.find({}).toArray();
  return docs.map((doc) => doc.version as number);
};

const recordMigration = async (db: import("mongodb").Db, version: number, name: string): Promise<void> => {
  await db.collection(COLLECTION_NAME).updateOne(
    { version },
    { $set: { name, appliedAt: new Date() } },
    { upsert: true }
  );
};

const removeRecord = async (db: import("mongodb").Db, version: number): Promise<void> => {
  await db.collection(COLLECTION_NAME).deleteOne({ version });
};

const loadMigrations = (): Migration[] => {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^\d{4}-.*\.ts$/.test(file))
    .sort();
  return files.map((file) => {
    const mod = require(path.join(MIGRATIONS_DIR, file)) as { default?: Migration };
    if (!mod.default) throw new Error(`La migración ${file} no exporta un default Migration`);
    return mod.default;
  });
};

const run = async (direction: "up" | "down"): Promise<void> => {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("Conexión a MongoDB no disponible");

  const applied = new Set(await getApplied(db));
  const migrations = loadMigrations();
  const target = direction === "up" ? migrations : [...migrations].reverse();

  for (const migration of target) {
    const isApplied = applied.has(migration.version);
    if (direction === "up" && isApplied) {
      console.log(`[migrate] ${migration.name} (v${migration.version}) ya aplicada, omitida`);
      continue;
    }
    if (direction === "down" && !isApplied) {
      console.log(`[migrate] ${migration.name} (v${migration.version}) no aplicada, omitida`);
      continue;
    }

    console.log(`[migrate] ${direction === "up" ? "Aplicando" : "Reviertiendo"}: ${migration.name} (v${migration.version})`);
    if (direction === "up") {
      await migration.up(db);
      await recordMigration(db, migration.version, migration.name);
    } else {
      await migration.down(db);
      await removeRecord(db, migration.version);
    }
    console.log(`[migrate] ${migration.name} (v${migration.version}) ${direction === "up" ? "aplicada" : "revertida"}`);
  }

  await mongoose.disconnect();
  console.log("[migrate] Proceso completado");
};

const direction = (process.argv[2] as "up" | "down") || "up";
if (direction !== "up" && direction !== "down") {
  console.error("[migrate] Dirección inválida. Usa: npm run migrate [up|down]");
  process.exit(1);
}

run(direction).catch((error) => {
  console.error("[migrate] Error:", error);
  process.exit(1);
});
