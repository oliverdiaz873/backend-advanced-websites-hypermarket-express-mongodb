import { ESLint } from "eslint";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";

/**
 * Lint enforce-forward con baseline explícito (E8.4).
 *
 * Lint de `src/**`, `tests/**` y `scripts/**` con ESLint (config tipada por
 * proyecto). Los hallazgos históricos de tests/scripts quedan registrados en
 * `eslint.baseline.json` (clave `archivo|regla` -> conteo). El comando falla
 * SOLO si aparece un hallazgo NUEVO o si el conteo supera el baseline:
 *  - un archivo nuevo con hallazgos -> clave no presente -> falla;
 *  - una violación nueva de una regla ya baselineada -> conteo > baseline -> falla.
 *
 * `src/**` nunca se oculta: su baseline está vacío, cualquier hallazgo falla.
 *
 * Regenerar el baseline solo de forma intencional:
 *   node scripts/eslint-check.mjs --update-baseline
 */

const BASELINE_FILE = "eslint.baseline.json";
const PATTERNS = ["src/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"];
const updateBaseline = process.argv.includes("--update-baseline");

const keyOf = (file, ruleId) => `${file}|${ruleId}`;

const summarize = (counts) => [...counts.values()].reduce((a, b) => a + b, 0);

async function main() {
  const eslint = new ESLint();
  const results = await eslint.lintFiles(PATTERNS);

  const counts = new Map();
  for (const result of results) {
    if (result.errorCount === 0 && result.warningCount === 0) continue;
    const file = relative(process.cwd(), result.filePath).replace(/\\/g, "/");
    for (const message of result.messages) {
      if (message.severity === 0) continue;
      const ruleId = message.ruleId ?? "(fatal)";
      const key = keyOf(file, ruleId);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  if (updateBaseline) {
    const baseline = Object.fromEntries([...counts.entries()].sort());
    writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(
      `Baseline actualizado: ${counts.size} claves, ${summarize(counts)} hallazgos en ${results.length} archivos.`,
    );
    return;
  }

  const raw = existsSync(BASELINE_FILE) ? readFileSync(BASELINE_FILE, "utf8") : "{}";
  const baseline = JSON.parse(raw);

  const violations = [];
  for (const [key, count] of counts) {
    const allowed = baseline[key] ?? 0;
    if (count > allowed) violations.push({ key, count, allowed });
  }

  if (violations.length > 0) {
    console.error("Nuevos hallazgos de lint (enforce-forward):");
    for (const { key, count, allowed } of violations) {
      console.error(`  ${key}: ${count} (baseline ${allowed})`);
    }
    console.error(
      "Regenera el baseline solo si es intencional: node scripts/eslint-check.mjs --update-baseline",
    );
    process.exit(1);
  }

  console.log(
    `Lint OK: ${summarize(counts)} hallazgos (todos en baseline) en ${results.length} archivos; sin hallazgos nuevos.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
