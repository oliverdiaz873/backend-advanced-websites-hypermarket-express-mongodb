import type { Migration } from "./types";
import type { Db } from "mongodb";

/**
 * Añade el perfil de cliente a la colección `users` (E4.1):
 * - `status`: estado de cuenta del cliente (`active` | `blocked` | `pending`),
 *   con valor `active` para los usuarios existentes (backward-compatible).
 * - `phone` / `avatar` / `address`: campos opcionales de perfil (sin datos a
 *   fabricar, Mongoose los modela opcionalmente).
 *
 * `up` es idempotente: solo toca los documentos que no tienen `status` y crea
 * los índices de listado admin. `down` revierte únicamente los índices (los
 * datos de perfil no se destruyen por ser retrocompatibles).
 */
const migration: Migration = {
  version: 6,
  name: "add-customer-profile-fields",
  up: async (db: Db) => {
    const users = db.collection("users");
    await users.updateMany(
      { status: { $exists: false } },
      { $set: { status: "active" } }
    );
    await users.createIndex({ role: 1, createdAt: -1 });
    await users.createIndex({ role: 1, status: 1 });
  },
  down: async (db: Db) => {
    const users = db.collection("users");
    await users.dropIndex("role_1_createdAt_-1").catch(() => undefined);
    await users.dropIndex("role_1_status_1").catch(() => undefined);
  },
};

export default migration;
