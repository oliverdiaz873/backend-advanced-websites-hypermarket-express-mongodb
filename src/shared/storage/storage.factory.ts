import config from "../../config";
import { logger } from "../logger/logger";
import { ObjectStorageProvider } from "./object-storage.provider";
import { LocalStorageProvider } from "./local.provider";
import { R2StorageProvider } from "./r2.provider";

let cachedProvider: ObjectStorageProvider | undefined;

/**
 * Crea el proveedor de storage según STORAGE_PROVIDER. El dominio de productos
 * no conoce el proveedor concreto: solo la interfaz ObjectStorageProvider.
 */
export const createObjectStorageProvider = (): ObjectStorageProvider => {
  if (config.storageProvider === "s3") {
    return new R2StorageProvider();
  }
  return new LocalStorageProvider();
};

/**
 * Singleton del proveedor activo. Se instancia una sola vez por proceso.
 */
export const getStorageProvider = (): ObjectStorageProvider => {
  if (!cachedProvider) {
    cachedProvider = createObjectStorageProvider();
    logger.info("Object storage provider inicializado", { provider: cachedProvider.name });
  }
  return cachedProvider;
};

/** Solo para tests: permite reiniciar el singleton. */
export const resetStorageProvider = (): void => {
  cachedProvider = undefined;
};
