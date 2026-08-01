import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import config from "../src/config";

const preflight = (): void => {
  const check = spawnSync("mongorestore", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    console.error("[restore] mongorestore not installed. Install MongoDB Database Tools.");
    console.error("    Descárgalos desde: https://www.mongodb.com/try/download/database-tools");
    process.exit(1);
  }
};

const run = (): void => {
  const backupUri = config.mongodbBackupUri || config.mongodbUri;
  if (!backupUri) {
    console.error("[restore] MONGODB_URI o MONGODB_BACKUP_URI no está definido.");
    process.exit(1);
  }

  const archiveArg = process.argv[2];
  if (!archiveArg) {
    console.error("[restore] Uso: npm run restore -- <archivo.archive.gz>");
    console.error(`    Busca los respaldos en: ${path.resolve(config.backupDir)}`);
    process.exit(1);
  }

  preflight();

  const archivePath = path.isAbsolute(archiveArg) ? archiveArg : path.resolve(config.backupDir, archiveArg);
  if (!fs.existsSync(archivePath)) {
    console.error(`[restore] No existe el archivo: ${archivePath}`);
    process.exit(1);
  }

  console.warn("[restore] ¡ADVERTENCIA! Esto reemplazará los datos actuales del destino.");
  console.log(`[restore] Archivo: ${archivePath}`);
  console.log(`[restore] Destino: ${backupUri.split("@")[1] ? "***" + "@" + backupUri.split("@")[1] : "local"}`);

  const result = spawnSync(
    "mongorestore",
    ["--uri", backupUri, "--archive=" + archivePath, "--gzip"],
    { encoding: "utf8", stdio: "inherit" }
  );

  if (result.error || result.status !== 0) {
    console.error("[restore] La restauración falló.");
    process.exit(result.status ?? 1);
  }

  console.log("[restore] Restauración completada.");
};

run();
