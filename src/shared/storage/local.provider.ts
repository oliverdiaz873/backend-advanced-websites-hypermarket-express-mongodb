import crypto from "crypto";
import fs from "fs";
import path from "path";
import config from "../../config";
import { UnauthorizedError } from "../errors/unauthorized.error";
import { InvalidDataError } from "../errors/invalid-data.error";
import { isSafeStorageKey, isSafeStoragePrefix, sniffImageMagicBytes } from "./uploads.constants";
import {
  ObjectStorageProvider,
  PresignedUploadOptions,
  PresignedUploadResult,
  StorageObjectInfo,
  ImageInspection,
} from "./object-storage.provider";

export interface LocalUploadReceiveParams {
  key: string;
  contentType: string;
  expires: number;
  signature: string;
  body: Buffer;
}

/**
 * Proveedor de almacenamiento local para desarrollo y tests. Implementa el
 * mismo contrato de presigned URLs que R2: el endpoint de presign devuelve una
 * uploadUrl firmada (HMAC) que apunta a `/api/uploads/local` del propio server;
 * el cliente hace PUT con el binario y el archivo se escribe en disco. Las URLs
 * públicas se sirven vía static desde `STORAGE_LOCAL_DIR`.
 */
export class LocalStorageProvider implements ObjectStorageProvider {
  readonly name = "local" as const;

  private readonly base: string;
  private readonly baseUrl: string;

  constructor() {
    this.base = path.resolve(config.storageLocalDir);
    this.baseUrl = config.storagePublicBaseUrl.replace(/\/+$/, "");
  }

  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
    const expires = Math.floor(Date.now() / 1000) + options.expiresInSeconds;
    const signature = this.sign(options.key, options.contentType, expires);

    const params = new URLSearchParams({
      key: options.key,
      contentType: options.contentType,
      expires: String(expires),
      sig: signature,
    });

    return {
      uploadUrl: `${this.baseUrl}/api/uploads/local?${params.toString()}`,
      publicUrl: this.getPublicUrl(options.key),
      expiresInSeconds: options.expiresInSeconds,
    };
  }

  getPublicUrl(key: string): string {
    if (!isSafeStorageKey(key)) {
      throw new InvalidDataError("Invalid storage key");
    }
    return config.storagePublicRelative ? `/uploads/${key}` : `${this.baseUrl}/uploads/${key}`;
  }

  async objectExists(key: string): Promise<boolean> {
    if (!isSafeStorageKey(key)) {
      return false;
    }
    return fs.existsSync(this.resolvePath(key));
  }

  async inspectImage(key: string): Promise<ImageInspection> {
    if (!isSafeStorageKey(key)) {
      return { exists: false, validContentType: false };
    }
    const fullPath = this.resolvePath(key);
    if (!fs.existsSync(fullPath)) {
      return { exists: false, validContentType: false };
    }
    const fd = await fs.promises.open(fullPath, "r");
    try {
      const buffer = Buffer.alloc(32);
      const { bytesRead } = await fd.read(buffer, 0, 32, 0);
      return { exists: true, validContentType: sniffImageMagicBytes(buffer.subarray(0, bytesRead)) };
    } finally {
      await fd.close();
    }
  }

  async listObjects(prefix: string): Promise<StorageObjectInfo[]> {
    if (!isSafeStoragePrefix(prefix)) {
      throw new InvalidDataError("Invalid storage prefix");
    }
    const full = this.resolvePath(prefix);
    if (!fs.existsSync(full)) {
      return [];
    }

    const results: StorageObjectInfo[] = [];
    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(abs);
        } else {
          const rel = path.relative(this.base, abs).split(path.sep).join("/");
          const stat = await fs.promises.stat(abs);
          results.push({ key: rel, lastModified: stat.mtime });
        }
      }
    };

    await walk(full);
    return results;
  }

  async deleteObject(key: string): Promise<void> {
    if (!isSafeStorageKey(key)) {
      throw new InvalidDataError("Invalid storage key");
    }
    await fs.promises.rm(this.resolvePath(key), { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    if (!isSafeStoragePrefix(prefix)) {
      throw new InvalidDataError("Invalid storage prefix");
    }
    await fs.promises.rm(this.resolvePath(prefix), { recursive: true, force: true });
  }

  async receiveUpload(params: LocalUploadReceiveParams): Promise<void> {
    const { key, contentType, expires, signature, body } = params;

    if (!isSafeStorageKey(key)) {
      throw new InvalidDataError("Invalid storage key");
    }
    if (!this.verify(key, contentType, expires, signature)) {
      throw new UnauthorizedError("Invalid or expired upload signature");
    }
    if (body.length > config.uploadMaxSizeBytes) {
      throw new InvalidDataError("File too large");
    }

    const fullPath = this.resolvePath(key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, body);
  }

  sign(key: string, contentType: string, expires: number): string {
    const hmac = crypto.createHmac("sha256", config.jwtSecret);
    hmac.update(`${key}|${contentType}|${expires}`);
    return hmac.digest("hex");
  }

  verify(key: string, contentType: string, expires: number, signature: string): boolean {
    try {
      if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) {
        return false;
      }
      const expected = Buffer.from(this.sign(key, contentType, expires));
      const provided = Buffer.from(signature);
      if (expected.length !== provided.length) {
        return false;
      }
      return crypto.timingSafeEqual(expected, provided);
    } catch {
      return false;
    }
  }

  /**
   * Resuelve la ruta absoluta dentro de storageLocalDir y verifica que el
   * resultado permanezca bajo la raíz (defensa en profundidad frente a cualquier
   * key/prefix que declare directorios padre).
   */
  private resolvePath(keyOrPrefix: string): string {
    const resolved = path.resolve(this.base, keyOrPrefix);
    const relative = path.relative(this.base, resolved);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new InvalidDataError("Invalid storage key");
    }
    return resolved;
  }
}
