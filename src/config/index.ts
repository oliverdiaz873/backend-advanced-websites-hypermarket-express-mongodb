import dotenv from "dotenv";
import path from "path";
import type { Config } from "../types";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  appVersion: process.env.npm_package_version ?? "1.0.0",
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:4200"],
  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/hypermarket",
};

export default config;
