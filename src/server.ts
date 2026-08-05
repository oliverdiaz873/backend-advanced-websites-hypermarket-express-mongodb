import app from "./app";
import config from "./config";
import { assertValidConfig } from "./config/validation";
import { connectDB } from "./config/database";
import { logger } from "./shared/logger/logger";
import mongoose from "mongoose";

const PORT = config.port || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async (): Promise<void> => {
  try {
    assertValidConfig(config);
    await connectDB();
    const server = app.listen(PORT, () => {
      logger.info("Server listening", { port: PORT, env: config.nodeEnv });
    });

    let shuttingDown = false;

    const shutdown = (signal: string): void => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info("Shutdown signal received", { signal });

      const forceExitTimer = setTimeout(() => {
        logger.error("Shutdown timeout reached, forcing exit");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      server.close(async (closeError) => {
        if (closeError) {
          logger.error("Error closing HTTP server", {
            error: closeError.message,
          });
        }
        try {
          await mongoose.disconnect();
          logger.info("Server and MongoDB connection closed");
          process.exit(0);
        } catch (disconnectError) {
          logger.error("Error disconnecting MongoDB", {
            error: disconnectError instanceof Error ? disconnectError.message : String(disconnectError),
          });
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
};

start();
