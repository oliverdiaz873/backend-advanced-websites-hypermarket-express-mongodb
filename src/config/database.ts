import mongoose from "mongoose";
import config from "./index";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongodbUri!);
    console.log(`[database] Conectado a MongoDB: ${config.mongodbUri}`);
  } catch (error) {
    console.error("[database] Error conectando a MongoDB:", error);
    throw error;
  }
};

mongoose.connection.on("error", (error) => {
  console.error("[database] Error en la conexión MongoDB:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[database] MongoDB desconectado");
});

mongoose.connection.on("reconnected", () => {
  console.log("[database] MongoDB reconectado");
});

export default mongoose;
