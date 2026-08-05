import mongoose from "mongoose";
import config from "./index";
import { logger } from "../shared/logger/logger";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri!);
    logger.info("MongoDB connected");
  } catch (error) {
    logger.error("Failed to connect to MongoDB", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

mongoose.connection.on("error", (error) => {
  logger.error("MongoDB connection error", {
    error: error instanceof Error ? error.message : String(error),
  });
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

export default mongoose;
