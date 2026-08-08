import dotenv from "dotenv";
import mongoose from "mongoose";
import config from "../src/config";
import { ProductModel } from "../src/modules/products/models/product.model";
import { getStorageProvider } from "../src/shared/storage/storage.factory";
import { ObjectStorageProvider, StorageObjectInfo } from "../src/shared/storage/object-storage.provider";
import { logger } from "../src/shared/logger/logger";

dotenv.config();

export const PENDING_RETENTION_MS = 60 * 60 * 1000; // 1 hora
export const PRODUCT_ORPHAN_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface CleanupInput {
  provider: ObjectStorageProvider;
  /** Map con el `imageKey` vigente por productId (Mongo es la fuente de verdad). */
  currentImageKeysByProduct: Map<string, string>;
  now?: Date;
  log?: (message: string) => void;
}

export interface CleanupSummary {
  pendingDeleted: number;
  pendingKept: number;
  productDeleted: number;
  productKept: number;
}

const noop = (): void => undefined;

export const productIdFromKey = (key: string): string | undefined => {
  const parts = key.split("/");
  if (parts.length === 3 && parts[0] === "products" && parts[1]) {
    return parts[1];
  }
  return undefined;
};

/**
 * True si el objeto es más antiguo que `retentionMs`. Si no hay timestamp
 * utilizable no se elimina (se protege cualquier upload en vuelo/indefinido).
 */
export const isExpiredRecord = (
  lastModified: Date | undefined,
  now: number,
  retentionMs: number
): boolean => {
  if (!lastModified || Number.isNaN(lastModified.getTime())) return false;
  return now - lastModified.getTime() > retentionMs;
};

const safeDelete = async (provider: ObjectStorageProvider, obj: StorageObjectInfo): Promise<void> => {
  try {
    await provider.deleteObject(obj.key);
  } catch (error) {
    logger.warn("orphan-cleanup: no se pudo eliminar el objeto", {
      key: obj.key,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Limpieza de huérfanos según las reglas F1 (idaempotente):
 * - `pending/*`: se eliminan solo si superan 1 hora.
 * - `products/{id}/*`: se elimina todo objeto que NO sea el `imageKey` vigente
 *   del producto y que tenga más de 24 horas. El vigente nunca se toca.
 */
export const runCleanup = async (input: CleanupInput): Promise<CleanupSummary> => {
  const log = input.log ?? noop;
  const now = (input.now ?? new Date()).getTime();
  const current = input.currentImageKeysByProduct;

  const summary: CleanupSummary = {
    pendingDeleted: 0,
    pendingKept: 0,
    productDeleted: 0,
    productKept: 0,
  };

  const pendingObjects = await input.provider.listObjects("pending");
  for (const obj of pendingObjects) {
    if (isExpiredRecord(obj.lastModified, now, PENDING_RETENTION_MS)) {
      await safeDelete(input.provider, obj);
      summary.pendingDeleted += 1;
      log(`[orphan-cleanup] pending/ borrado: ${obj.key}`);
    } else {
      summary.pendingKept += 1;
    }
  }

  const productObjects = await input.provider.listObjects("products");
  for (const obj of productObjects) {
    const productId = productIdFromKey(obj.key);
    if (!productId) {
      summary.productKept += 1;
      continue;
    }
    if (current.get(productId) === obj.key) {
      summary.productKept += 1; // vigente: nunca borrar
      continue;
    }
    if (isExpiredRecord(obj.lastModified, now, PRODUCT_ORPHAN_RETENTION_MS)) {
      await safeDelete(input.provider, obj);
      summary.productDeleted += 1;
      log(`[orphan-cleanup] products/ huérfano borrado: ${obj.key}`);
    } else {
      summary.productKept += 1;
    }
  }

  return summary;
};

const run = async (): Promise<void> => {
  await mongoose.connect(config.mongodbUri ?? "mongodb://localhost:27017/hypermarket");
  try {
    const provider = getStorageProvider();
    const products = await ProductModel.find({ imageKey: { $exists: true } })
      .select("_id imageKey")
      .lean();

    const current = new Map<string, string>();
    for (const product of products) {
      if (product.imageKey) {
        current.set(String(product._id), product.imageKey);
      }
    }

    logger.info("orphan-cleanup iniciado", {
      provider: provider.name,
      productsWithImageKey: current.size,
    });

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: current,
      log: (message) => logger.info(message),
    });

    logger.info("orphan-cleanup finalizado", {
      ...summary,
      totalCandidates: summary.pendingKept + summary.pendingDeleted + summary.productKept + summary.productDeleted,
    });
  } finally {
    await mongoose.disconnect();
  }
};

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error("orphan-cleanup falló", { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    });
}