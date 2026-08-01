import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import config from "../src/config";

const preflight = (): void => {
  const check = spawnSync("mongodump", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    console.error("[backup] mongodump not installed. Install MongoDB Database Tools.");
    console.error("    Descárgalos desde: https://www.mongodb.com/try/download/database-tools");
    process.exit(1);
  }
};

const run = (): void => {
  const backupUri = config.mongodbBackupUri || config.mongodbUri;
  if (!backupUri) {
    console.error("[backup] MONGODB_URI o MONGODB_BACKUP_URI no está definido.");
    process.exit(1);
  }

  preflight();

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = path.resolve(config.backupDir);
  const outputFile = path.join(backupDir, `hypermarket-${timestamp}.archive.gz`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`[backup] URI de respaldo: ${backupUri.split("@")[1] ? "***" + "@" + backupUri.split("@")[1] : "local"}`);
  console.log(`[backup] Creando respaldo en: ${outputFile}`);

  const result = spawnSync(
    "mongodump",
    ["--uri", backupUri, "--archive=" + outputFile, "--gzip"],
    { encoding: "utf8", stdio: "inherit" }
  );

  if (result.error || result.status !== 0) {
    console.error("[backup] El respaldo falló.");
    process.exit(result.status ?? 1);
  }

  console.log("[backup] Respaldo completado.");
};

run();
