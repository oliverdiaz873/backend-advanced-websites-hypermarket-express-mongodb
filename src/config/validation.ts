import type { Config } from "../types";
import { logger } from "../shared/logger/logger";

const NODE_ENVS = ["development", "test", "production"] as const;

interface ConfigError {
  field: string;
  message: string;
}

const STORAGE_PROVIDERS = ["local", "s3"] as const;

const validateConfig = (config: Config): ConfigError[] => {
  const errors: ConfigError[] = [];

  if (!NODE_ENVS.includes(config.nodeEnv as (typeof NODE_ENVS)[number])) {
    errors.push({ field: "NODE_ENV", message: `must be one of: ${NODE_ENVS.join(", ")}` });
  }

  if (!Number.isInteger(config.port) || config.port <= 0) {
    errors.push({ field: "PORT", message: "must be a positive integer" });
  }

  if (!config.jwtSecret) {
    errors.push({ field: "JWT_SECRET", message: "is required" });
  }

  if (!config.mongodbUri) {
    errors.push({ field: "MONGODB_URI", message: "is required" });
  } else if (!/^mongodb(\+srv)?:\/\//.test(config.mongodbUri)) {
    errors.push({ field: "MONGODB_URI", message: "must be a valid mongodb connection string" });
  }

  if (!config.corsOrigin.length) {
    errors.push({ field: "CORS_ORIGIN", message: "is required" });
  }

  if (!STORAGE_PROVIDERS.includes(config.storageProvider as (typeof STORAGE_PROVIDERS)[number])) {
    errors.push({ field: "STORAGE_PROVIDER", message: `must be one of: ${STORAGE_PROVIDERS.join(", ")}` });
  }

  if (!Number.isInteger(config.uploadMaxSizeBytes) || config.uploadMaxSizeBytes <= 0) {
    errors.push({ field: "UPLOAD_MAX_SIZE_BYTES", message: "must be a positive integer" });
  }

  if (!Number.isInteger(config.uploadPresignExpiresSeconds) || config.uploadPresignExpiresSeconds <= 0) {
    errors.push({ field: "UPLOAD_PRESIGN_EXPIRES_SECONDS", message: "must be a positive integer" });
  }

  if (config.storageProvider === "s3") {
    if (!config.r2AccountId) errors.push({ field: "R2_ACCOUNT_ID", message: "is required when STORAGE_PROVIDER=s3" });
    if (!config.r2AccessKeyId) errors.push({ field: "R2_ACCESS_KEY_ID", message: "is required when STORAGE_PROVIDER=s3" });
    if (!config.r2SecretAccessKey) errors.push({ field: "R2_SECRET_ACCESS_KEY", message: "is required when STORAGE_PROVIDER=s3" });
    if (!config.r2Bucket) errors.push({ field: "R2_BUCKET", message: "is required when STORAGE_PROVIDER=s3" });
    if (!config.r2PublicUrl) errors.push({ field: "R2_PUBLIC_URL", message: "is required when STORAGE_PROVIDER=s3" });
  }

  return errors;
};

export const assertValidConfig = (config: Config): void => {
  const errors = validateConfig(config);
  const isProduction = config.nodeEnv === "production";
  const invalidNodeEnv = !NODE_ENVS.includes(config.nodeEnv as (typeof NODE_ENVS)[number]);

  if (errors.length === 0) return;

  const details = errors.map((e) => `  - ${e.field}: ${e.message}`).join("\n");

  if (isProduction || invalidNodeEnv) {
    throw new Error(`Invalid configuration:\n${details}`);
  }

  logger.warn("Invalid configuration (ignored outside production)", { details });
};

export default assertValidConfig;
