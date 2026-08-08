import config from "../../../config";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { getStorageProvider } from "../../../shared/storage/storage.factory";
import {
  isAllowedImageMime,
  extensionMatchesContentType,
  isSafeProductId,
  buildProductImageKey,
  buildPendingKey,
} from "../../../shared/storage/uploads.constants";

export type UploadPurpose = "product" | "pending";

export interface CreatePresignedUploadParams {
  productId?: string;
  fileName: string;
  contentType: string;
  purpose?: string;
}

export interface CreatePresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  expiresInSeconds: number;
  key: string;
  productId?: string;
  purpose: UploadPurpose;
}

const resolvePurpose = (value: unknown): UploadPurpose => (value === "pending" ? "pending" : "product");

const validateAndGetExtension = (fileName: string, contentType: string): string => {
  if (typeof contentType !== "string" || !isAllowedImageMime(contentType)) {
    throw new InvalidDataError(`Unsupported content type: ${contentType}`);
  }
  if (typeof fileName !== "string" || !fileName.trim()) {
    throw new InvalidDataError("fileName is required");
  }
  const extension = (fileName.split(".").pop() ?? "").toLowerCase();
  if (!extensionMatchesContentType(contentType, extension)) {
    throw new InvalidDataError(`Invalid file extension for content type ${contentType}`);
  }
  return extension;
};

export const createPresignedUpload = async (
  params: CreatePresignedUploadParams
): Promise<CreatePresignedUploadResult> => {
  const purpose = resolvePurpose(params.purpose);
  const extension = validateAndGetExtension(params.fileName, params.contentType);
  const provider = getStorageProvider();

  const productId = purpose === "product" ? params.productId : undefined;

  if (purpose === "product") {
    if (typeof productId !== "string" || !isSafeProductId(productId)) {
      throw new InvalidDataError("productId is required for product uploads");
    }
  }

  const key = productId ? buildProductImageKey(productId, extension) : buildPendingKey(extension);

  const { uploadUrl, publicUrl, expiresInSeconds } = await provider.getPresignedUploadUrl({
    key,
    contentType: params.contentType,
    expiresInSeconds: config.uploadPresignExpiresSeconds,
  });

  return { uploadUrl, publicUrl, expiresInSeconds, key, productId, purpose };
};
