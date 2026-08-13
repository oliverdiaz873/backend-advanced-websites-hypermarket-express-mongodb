import type { Migration } from "./types";
import type { Db, ObjectId } from "mongodb";

/**
 * Curaduría de productos destacados (E4.6): marca `featured: true` en el set
 * original de destacados del Home (los 7 que antes venían hardcodeados como
 * FEATURED_IDS en Angular y Next).
 *
 * Idempotente: `up` solo activa el flag en esos 7 ids y no toca el resto.
 * `down` revierte únicamente esos 7 ids a `featured: false`.
 */
const FEATURED_PRODUCT_IDS = [
  "televisor_samsung_75_pulgadas",
  "nevera_lg",
  "ventilador_daiwa",
  "sofa_cama_blanco",
  "carne_de_res_para_hamburguesas",
  "pollo_entero_don_pollo",
  "atun_dimar",
];

const migration: Migration = {
  version: 8,
  name: "set-featured-products",
  up: async (db: Db) => {
    const products = db.collection("products");
    await products.updateMany(
      { _id: { $in: FEATURED_PRODUCT_IDS as unknown as ObjectId[] } },
      { $set: { featured: true } }
    );
  },
  down: async (db: Db) => {
    const products = db.collection("products");
    await products.updateMany(
      { _id: { $in: FEATURED_PRODUCT_IDS as unknown as ObjectId[] } },
      { $set: { featured: false } }
    );
  },
};

export default migration;
