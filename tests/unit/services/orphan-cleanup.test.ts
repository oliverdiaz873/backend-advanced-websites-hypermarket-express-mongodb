import fs from "fs";
import os from "os";
import path from "path";
import config from "../../../src/config";
import { LocalStorageProvider } from "../../../src/shared/storage/local.provider";
import {
  isExpiredRecord,
  productIdFromKey,
  runCleanup,
  PENDING_RETENTION_MS,
  PRODUCT_ORPHAN_RETENTION_MS,
} from "../../../scripts/orphan-cleanup";

describe("orphan-cleanup (reglas F1)", () => {
  let tmpDir: string;
  let provider: LocalStorageProvider;

  const k = (key: string): string => path.join(tmpDir, key);

  const write = (key: string, ageMs: number): void => {
    const full = k(key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from("x"));
    const when = new Date(Date.now() - ageMs);
    fs.utimesSync(full, when, when);
  };

  const exists = (key: string): boolean => fs.existsSync(k(key));

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "orphan-cleanup-"));
    (config as unknown as Record<string, unknown>).storageLocalDir = tmpDir;
    provider = new LocalStorageProvider();
  });

  beforeEach(() => {
    fs.rmSync(k("pending"), { recursive: true, force: true });
    fs.rmSync(k("products"), { recursive: true, force: true });
    fs.mkdirSync(k("pending"), { recursive: true });
    fs.mkdirSync(k("products"), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("borra pending >1h y conserva pending <1h", async () => {
    write("pending/old-uuid.webp", PENDING_RETENTION_MS + 60_000);
    write("pending/new-uuid.webp", PENDING_RETENTION_MS - 60_000);

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: new Map(),
      log: () => undefined,
    });

    expect(exists("pending/old-uuid.webp")).toBe(false);
    expect(exists("pending/new-uuid.webp")).toBe(true);
    expect(summary.pendingDeleted).toBe(1);
    expect(summary.pendingKept).toBe(1);
  });

  it("products: borra huérfanos >24h pero jamás el imageKey vigente", async () => {
    const pid = "prod-abc";
    const currentKey = `products/${pid}/current.webp`;
    write(currentKey, PRODUCT_ORPHAN_RETENTION_MS + 60_000);
    write(`products/${pid}/old.webp`, PRODUCT_ORPHAN_RETENTION_MS + 60_000);

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: new Map([[pid, currentKey]]),
      log: () => undefined,
    });

    expect(exists(currentKey)).toBe(true);
    expect(exists(`products/${pid}/old.webp`)).toBe(false);
    expect(summary.productDeleted).toBe(1);
    expect(summary.productKept).toBe(1);
  });

  it("products: conserva huérfanos <24h (protege uploads en vuelo)", async () => {
    const pid = "prod-def";
    write(`products/${pid}/fresh.webp`, 3 * 60 * 60 * 1000);

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: new Map(),
      log: () => undefined,
    });

    expect(exists(`products/${pid}/fresh.webp`)).toBe(true);
    expect(summary.productDeleted).toBe(0);
    expect(summary.productKept).toBe(1);
  });

  it("products: un producto sin documento en Mongo queda limpio pasado 24h", async () => {
    const pid = "prod-gone";
    write(`products/${pid}/leftover.webp`, PRODUCT_ORPHAN_RETENTION_MS + 60_000);

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: new Map(),
      log: () => undefined,
    });

    expect(exists(`products/${pid}/leftover.webp`)).toBe(false);
    expect(summary.productDeleted).toBe(1);
  });

  it("distingue múltiples versiones y conserva la vigente", async () => {
    const pid = "prod-multi";
    const current = `products/${pid}/v3.webp`;
    write(current, 2 * 60 * 60 * 1000);
    write(`products/${pid}/v1.webp`, PRODUCT_ORPHAN_RETENTION_MS + 60_000);
    write(`products/${pid}/v2.webp`, PRODUCT_ORPHAN_RETENTION_MS + 60_000);

    const summary = await runCleanup({
      provider,
      currentImageKeysByProduct: new Map([[pid, current]]),
      log: () => undefined,
    });

    expect(exists(current)).toBe(true);
    expect(exists(`products/${pid}/v2.webp`)).toBe(false);
    expect(summary.productDeleted).toBe(2);
  });

  it("es idempotente: una segunda ejecución no borra nada más", async () => {
    write("pending/stale.webp", PENDING_RETENTION_MS + 60_000);
    const pid = "prod-idem";
    write(`products/${pid}/lonely.webp`, PRODUCT_ORPHAN_RETENTION_MS + 60_000);

    const opts = { provider, currentImageKeysByProduct: new Map<string, string>(), log: () => undefined };
    const first = await runCleanup(opts);
    const second = await runCleanup(opts);

    expect(first.productDeleted + first.pendingDeleted).toBe(2);
    expect(second.productDeleted + second.pendingDeleted).toBe(0);
  });

  it("productIdFromKey solo acepta products/{id}/file", () => {
    expect(productIdFromKey("products/p-1/a.webp")).toBe("p-1");
    expect(productIdFromKey("pending/u.webp")).toBeUndefined();
    expect(productIdFromKey("products/p1.webp")).toBeUndefined();
  });

  it("isExpiredRecord no elige cuando falta el timestamp", () => {
    expect(isExpiredRecord(undefined, Date.now(), PENDING_RETENTION_MS)).toBe(false);
    expect(isExpiredRecord(new Date(Date.now() - 2 * PENDING_RETENTION_MS), Date.now(), PENDING_RETENTION_MS)).toBe(true);
  });
});