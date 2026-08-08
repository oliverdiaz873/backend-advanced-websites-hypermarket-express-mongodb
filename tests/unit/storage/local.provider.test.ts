import fs from "fs";
import path from "path";
import config from "../../../src/config";
import { LocalStorageProvider } from "../../../src/shared/storage/local.provider";
import { UnauthorizedError } from "../../../src/shared/errors/unauthorized.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";

describe("LocalStorageProvider", () => {
  const dir = config.storageLocalDir;
  const provider = new LocalStorageProvider();

  beforeAll(() => {
    fs.mkdirSync(dir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("genera uploadUrl firmada y publicUrl", async () => {
    const res = await provider.getPresignedUploadUrl({
      key: "products/abc/original.webp",
      contentType: "image/webp",
      expiresInSeconds: 600,
    });

    expect(res.expiresInSeconds).toBe(600);
    expect(res.publicUrl).toContain("/uploads/products/abc/original.webp");
    expect(res.uploadUrl).toContain("/api/uploads/local?");
    expect(res.uploadUrl).toContain("contentType=image%2Fwebp");
    expect(res.uploadUrl).toContain("sig=");
  });

  it("recibe el binario con firma válida y lo escribe en disco", async () => {
    const key = "products/test-123/original.png";
    const presigned = await provider.getPresignedUploadUrl({ key, contentType: "image/png", expiresInSeconds: 600 });
    const url = new URL(presigned.uploadUrl);

    await provider.receiveUpload({
      key: url.searchParams.get("key") as string,
      contentType: url.searchParams.get("contentType") as string,
      expires: Number(url.searchParams.get("expires")),
      signature: url.searchParams.get("sig") as string,
      body: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    });

    expect(fs.existsSync(path.join(dir, key))).toBe(true);
    expect(fs.readFileSync(path.join(dir, key))).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  it("rechaza una firma inválida", async () => {
    const presigned = await provider.getPresignedUploadUrl({
      key: "products/abc/original.webp",
      contentType: "image/webp",
      expiresInSeconds: 600,
    });
    const url = new URL(presigned.uploadUrl);

    await expect(
      provider.receiveUpload({
        key: url.searchParams.get("key") as string,
        contentType: url.searchParams.get("contentType") as string,
        expires: Number(url.searchParams.get("expires")),
        signature: "signature-invalida",
        body: Buffer.from("xx"),
      })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rechaza key con path traversal al firmar la URL", async () => {
    await expect(
      provider.getPresignedUploadUrl({
        key: "../escape.png",
        contentType: "image/png",
        expiresInSeconds: 600,
      })
    ).rejects.toBeInstanceOf(InvalidDataError);
  });

  it("objectExists y deleteObject", async () => {
    const key = "products/test-exists/original.png";
    const full = path.join(dir, key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from("data"));

    expect(await provider.objectExists(key)).toBe(true);

    await provider.deleteObject(key);
    expect(await provider.objectExists(key)).toBe(false);
  });

  it("listObjects recorre el prefijo y deletePrefix lo elimina", async () => {
    const key = "products/prod-x/68f1.webp";
    const full = path.join(dir, key);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, Buffer.from("img"));

    const objects = await provider.listObjects("products/prod-x");
    expect(objects.map((o) => o.key)).toContain(key);

    await provider.deletePrefix("products/prod-x");
    expect(await provider.listObjects("products/prod-x")).toHaveLength(0);
    expect(await provider.objectExists(key)).toBe(false);
  });

  it("rechaza la firma expirada", async () => {
    const key = "products/expired/file.webp";
    const expires = Math.floor(Date.now() / 1000) - 120;
    const signature = provider.sign(key, "image/webp", expires);

    await expect(
      provider.receiveUpload({ key, contentType: "image/webp", expires, signature, body: Buffer.from("xx") })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("rechaza un binario mayor al máximo configurado", async () => {
    const key = "products/big/file.webp";
    const presigned = await provider.getPresignedUploadUrl({ key, contentType: "image/webp", expiresInSeconds: 600 });
    const url = new URL(presigned.uploadUrl);
    const body = Buffer.alloc(config.uploadMaxSizeBytes + 1);

    await expect(
      provider.receiveUpload({
        key: url.searchParams.get("key") as string,
        contentType: url.searchParams.get("contentType") as string,
        expires: Number(url.searchParams.get("expires")),
        signature: url.searchParams.get("sig") as string,
        body,
      })
    ).rejects.toBeInstanceOf(InvalidDataError);
    expect(fs.existsSync(path.join(dir, key))).toBe(false);
  });

  it("protege todas las operaciones contra traversal (P1-3)", async () => {
    const unsafe = ["products/8f3a/..", "products/../", "pending/..", "../evil.webp", "C:\\evil", "..\\evil"];

    for (const key of unsafe) {
      await expect(provider.deleteObject(key)).rejects.toBeInstanceOf(InvalidDataError);
      await expect(provider.objectExists(key)).resolves.toBe(false);
      expect(() => provider.getPublicUrl(key)).toThrow(InvalidDataError);
      await expect(provider.listObjects(key)).rejects.toBeInstanceOf(InvalidDataError);
      await expect(provider.deletePrefix(key)).rejects.toBeInstanceOf(InvalidDataError);
    }
  });
});
