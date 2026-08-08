export interface PresignedUploadOptions {
  key: string;
  contentType: string;
  expiresInSeconds: number;
}

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export interface StorageObjectInfo {
  key: string;
  lastModified?: Date;
}

export interface ImageInspection {
  exists: boolean;
  validContentType: boolean;
}

export interface ObjectStorageProvider {
  readonly name: "local" | "s3";
  getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult>;
  getPublicUrl(key: string): string;
  objectExists(key: string): Promise<boolean>;
  /**
   * Verifica que el objeto exista y que su contenido sea una imagen válida
   * (best-effort): en local se leen los magic bytes; en R2 se hace HEAD y se
   * comprueba el Content-Type almacenado.
   */
  inspectImage(key: string): Promise<ImageInspection>;
  listObjects(prefix: string): Promise<StorageObjectInfo[]>;
  deleteObject(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
