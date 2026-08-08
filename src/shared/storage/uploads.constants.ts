import { randomUUID } from "crypto";

export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const UPLOAD_PRESIGN_EXPIRES_SECONDS = 600;

export const KEY_DIR_PRODUCTS = "products";

export const KEY_DIR_PENDING = "pending";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp" | "image/avif" | "image/gif";

export const ALLOWED_IMAGE_MIME_TYPES: Record<ImageMimeType, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/avif": ["avif"],
  "image/gif": ["gif"],
};

export const isAllowedImageMime = (contentType: string): boolean =>
  Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_MIME_TYPES, contentType);

export const isAllowedImageExtension = (extension: string): boolean =>
  Object.values(ALLOWED_IMAGE_MIME_TYPES).some((exts) => exts.includes(extension.toLowerCase()));

export const extensionMatchesContentType = (contentType: string, extension: string): boolean => {
  const allowed = ALLOWED_IMAGE_MIME_TYPES[contentType as ImageMimeType];
  return allowed !== undefined && allowed.includes(extension.toLowerCase());
};

export const defaultExtensionForContentType = (contentType: string): string | undefined =>
  ALLOWED_IMAGE_MIME_TYPES[contentType as ImageMimeType]?.[0];

/**
 * Genera una key de imagen definitiva y única para un producto. Cada presign
 * produce un objeto inmutable (no se sobrescribe la imagen vigente), lo que
 * permite reemplazar una imagen de forma segura: subir la nueva, validar,
 * actualizar el producto y borrar la anterior.
 */
export const buildProductImageKey = (productId: string, extension: string): string =>
  `${KEY_DIR_PRODUCTS}/${productId}/${randomUUID()}.${extension.toLowerCase()}`;

export const buildPendingKey = (extension: string): string => `${KEY_DIR_PENDING}/${randomUUID()}.${extension.toLowerCase()}`;

/** IDs de producto admitidos como parte de una key (UUID, slugs legacy, etc.). */
export const isSafeProductId = (id: string): boolean => /^[a-zA-Z0-9_-]{1,128}$/.test(id);

/**
 * Directorios raíz soportados para las keys de objetos. Toda key de storage debe
 * vivir bajo uno de estos prefijos; cualquier otro top-level se rechaza.
 */
export const STORAGE_TOP_DIRS = ["products", "pending"] as const;

export type StorageTopDir = (typeof STORAGE_TOP_DIRS)[number];

const TOP_DIR_RE = /^[a-z0-9-]{1,64}$/;

const SUBDIR_RE = /^[a-zA-Z0-9_-]{1,128}$/;

// El archivo debe empezar por alfanumérico (nunca `.` ni `..`) y no contener
// segmentos peligrosos; `..` se descarta globalmente en isSafeStorageKey.
const FILE_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

const REJECTED_CHARS = ["\0", "\\"];

const containsRejectedSequence = (value: string): boolean =>
  REJECTED_CHARS.some((token) => value.includes(token)) || value.includes("..");

/**
 * Valida que una key sea segura para uso en storage: un directorio raíz
 * permitido, un subdirectorio opcional y un nombre de archivo, sin path
 * traversal.
 * Ej. `products/8f3a.../68f1-...webp` o `pending/<uuid>.webp`.
 *
 * Rechaza explícitamente segmenteos `.`/`..`, segmentos vacíos, rutas absolutas,
 * backslashes, null bytes y cualquier key que salga del árbol permitido.
 */
export const isSafeStorageKey = (key: string): boolean => {
  if (typeof key !== "string" || key.length === 0 || key.length > 512) return false;
  if (containsRejectedSequence(key)) return false;
  if (key.startsWith("/") || key.startsWith(".") || key.endsWith("/") || key.endsWith(".")) return false;

  const segments = key.split("/");
  if (segments.length !== 2 && segments.length !== 3) return false;

  const dir = segments[0];
  if (!TOP_DIR_RE.test(dir) || !(STORAGE_TOP_DIRS as readonly string[]).includes(dir)) return false;

  if (segments.length === 2) {
    return FILE_RE.test(segments[1]);
  }
  return SUBDIR_RE.test(segments[1]) && FILE_RE.test(segments[2]);
};

/**
 * Valida un prefijo de listado/borrado. Acepta tanto una key completa
 * (`products/{id}/...`) como un directorio de raíz (`products`, `pending`).
 */
export const isSafeStoragePrefix = (prefix: string): boolean => {
  if (typeof prefix !== "string") return false;
  const trimmed = prefix.replace(/\/+$/, "");
  if (!trimmed) return false;
  if (containsRejectedSequence(trimmed)) return false;
  if ((STORAGE_TOP_DIRS as readonly string[]).includes(trimmed)) return true;
  return isSafeStorageKey(trimmed);
};

/**
 * Detecta, mediante magic bytes, si un buffer es una imagen de los formatos
 * permitidos (jpeg, png, webp, avif, gif). Uso: validación best-effort del
 * contenido en el proveedor local (en R2 solo se puede hacer HEAD).
 */
export const sniffImageMagicBytes = (buffer: Buffer): boolean => {
  if (!buffer || buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // jpeg
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return true; // png
  if (buffer.subarray(0, 4).toString("ascii") === "GIF8") return true; // gif
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true; // webp
  }
  if (
    buffer.subarray(4, 8).toString("ascii") === "ftyp" &&
    ["avif", "avis"].includes(buffer.subarray(8, 12).toString("ascii"))
  ) {
    return true; // avif
  }
  return false;
};
