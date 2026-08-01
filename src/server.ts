import app from "./app";
import config from "./config";
import { assertValidConfig } from "./config/validation";
import { connectDB } from "./config/database";
import mongoose from "mongoose";

const PORT = config.port || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

const start = async (): Promise<void> => {
  try {
    assertValidConfig(config);
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT} [${config.nodeEnv}]`);
    });

    let shuttingDown = false;

    const shutdown = (signal: string): void => {
      if (shuttingDown) return;
      shuttingDown = true;
      console.log(`[server] Recibido ${signal}, cerrando servidor...`);

      const forceExitTimer = setTimeout(() => {
        console.error("[server] Timeout de cierre alcanzado, forzando salida");
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS);
      forceExitTimer.unref();

      server.close(async (closeError) => {
        if (closeError) {
          console.error("[server] Error cerrando servidor:", closeError);
        }
        try {
          await mongoose.disconnect();
          console.log("[server] Servidor y conexión a MongoDB cerrados");
          process.exit(0);
        } catch (disconnectError) {
          console.error("[server] Error desconectando MongoDB:", disconnectError);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
};

start();
