import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import config from "../../config";
import {
  ObjectStorageProvider,
  PresignedUploadOptions,
  PresignedUploadResult,
  StorageObjectInfo,
  ImageInspection,
} from "./object-storage.provider";
import { isSafeStorageKey, isSafeStoragePrefix, ALLOWED_IMAGE_MIME_TYPES } from "./uploads.constants";
import { InvalidDataError } from "../errors/invalid-data.error";

export interface R2StorageOptions {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  publicUrl?: string;
  endpoint?: string;
}

/**
 * Proveedor de object storage compatible con S3 (Cloudflare R2 en producción).
 * Usa presigned URLs para que el cliente suba el archivo directamente, sin que
 * el binario pase por Express. Ver docs/ADR-012-storage-r2.md y
 * docs/ADR-013-presigned-uploads.md.
 */
export class R2StorageProvider implements ObjectStorageProvider {
  readonly name = "s3" as const;

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(options: R2StorageOptions = {}) {
    const accountId = options.accountId ?? config.r2AccountId ?? "";
    const accessKeyId = options.accessKeyId ?? config.r2AccessKeyId ?? "";
    const secretAccessKey = options.secretAccessKey ?? config.r2SecretAccessKey ?? "";
    const endpoint =
      options.endpoint ??
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    this.bucket = options.bucket ?? config.r2Bucket ?? "";
    this.publicBaseUrl = (options.publicUrl ?? config.r2PublicUrl ?? "").replace(/\/+$/, "");

    this.client = new S3Client({
      region: "auto",
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      ContentType: options.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: options.expiresInSeconds,
    });

    return {
      uploadUrl,
      publicUrl: this.getPublicUrl(options.key),
      expiresInSeconds: options.expiresInSeconds,
    };
  }

  getPublicUrl(key: string): string {
    if (!isSafeStorageKey(key)) {
      throw new InvalidDataError("Invalid storage key");
    }
    return `${this.publicBaseUrl}/${key}`;
  }

  async objectExists(key: string): Promise<boolean> {
    if (!isSafeStorageKey(key)) {
      return false;
    }
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async inspectImage(key: string): Promise<ImageInspection> {
    if (!isSafeStorageKey(key)) {
      return { exists: false, validContentType: false };
    }
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      const contentType = head.ContentType ?? "";
      return {
        exists: true,
        validContentType: Object.prototype.hasOwnProperty.call(ALLOWED_IMAGE_MIME_TYPES, contentType),
      };
    } catch {
      return { exists: false, validContentType: false };
    }
  }

  async listObjects(prefix: string): Promise<StorageObjectInfo[]> {
    if (!isSafeStoragePrefix(prefix)) {
      throw new InvalidDataError("Invalid storage prefix");
    }
    const results: StorageObjectInfo[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        })
      );

      for (const content of response.Contents ?? []) {
        if (content.Key) {
          results.push({ key: content.Key, lastModified: content.LastModified });
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken);

    return results;
  }

  async deleteObject(key: string): Promise<void> {
    if (!isSafeStorageKey(key)) {
      throw new InvalidDataError("Invalid storage key");
    }
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async deletePrefix(prefix: string): Promise<void> {
    if (!isSafeStoragePrefix(prefix)) {
      throw new InvalidDataError("Invalid storage prefix");
    }
    const objects = await this.listObjects(prefix);
    for (let i = 0; i < objects.length; i += 1000) {
      const batch = objects.slice(i, i + 1000).map((obj) => ({ Key: obj.key }));
      const response = await this.client.send(
        new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: batch, Quiet: true } })
      );
      if (response.Errors && response.Errors.length > 0) {
        const failed = response.Errors.map((e) => e.Key ?? "?").join(", ");
        throw new Error(`Failed to delete R2 objects: ${failed}`);
      }
    }
  }
}
