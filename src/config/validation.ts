import type { Config } from "../types";
import { logger } from "../shared/logger/logger";

const NODE_ENVS = ["development", "test", "production"] as const;

interface ConfigError {
  field: string;
  message: string;
}

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
