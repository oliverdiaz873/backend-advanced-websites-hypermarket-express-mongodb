import app from "./app";
import config from "./config";
import { connectDB } from "./config/database";

const PORT = config.port || 3000;

const start = async (): Promise<void> => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT} [${config.nodeEnv}]`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
};

start();
