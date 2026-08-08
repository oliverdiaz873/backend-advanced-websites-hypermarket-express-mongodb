import request from "supertest";
import fs from "fs";
import path from "path";
import express from "express";
import config from "../../../src/config";
import localUploadRoutes from "../../../src/modules/uploads/routes/local-upload.routes";
import { LocalStorageProvider } from "../../../src/shared/storage/local.provider";
import { getStorageProvider, resetStorageProvider } from "../../../src/shared/storage/storage.factory";
import { createTestApp } from "../helpers/test-app";

const dir = config.storageLocalDir;
const app = createTestApp("/api/uploads", localUploadRoutes);

let provider: LocalStorageProvider;

beforeAll(() => {
  resetStorageProvider();
  provider = getStorageProvider() as LocalStorageProvider;
  fs.mkdirSync(dir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  resetStorageProvider();
});

const presignedUrl = async (key: string, contentType: string): Promise<URL> => {
  const res = await provider.getPresignedUploadUrl({ key, contentType, expiresInSeconds: 600 });
  return new URL(res.uploadUrl);
};

const putImage = (url: URL, body: Buffer) =>
  request(app)
    .put(`/api/uploads/local?${url.searchParams.toString()}`)
    .set("Content-Type", url.searchParams.get("contentType") as string)
    .send(body);

describe("PUT /api/uploads/local (provider local)", () => {
  it("sube un archivo válido con firma correcta y lo persiste", async () => {
    const key = "products/upload-test/original.png";
    const url = await presignedUrl(key, "image/png");
    const body = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d]);

    const res = await putImage(url, body);

    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(dir, key))).toBe(true);
    expect(fs.readFileSync(path.join(dir, key))).toEqual(body);
  });

  it("rechaza firma inválida con 401", async () => {
    const url = await presignedUrl("products/upload-bad/original.png", "image/png");
    const params = new URLSearchParams(url.searchParams);
    params.set("sig", "firma-invalida");

    const res = await request(app)
      .put(`/api/uploads/local?${params.toString()}`)
      .set("Content-Type", "image/png")
      .send(Buffer.from("x"));

    expect(res.status).toBe(401);
  });

  it("rechaza key con path traversal con 400 (defensa del receptor)", async () => {
    const expires = Math.floor(Date.now() / 1000) + 600;
    const signature = provider.sign("../evil.png", "image/png", expires);

    const res = await request(app)
      .put("/api/uploads/local")
      .query({
        key: "../evil.png",
        contentType: "image/png",
        expires: String(expires),
        sig: signature,
      })
      .set("Content-Type", "image/png")
      .send(Buffer.from("x"));

    expect(res.status).toBe(400);
    expect(fs.existsSync(path.join(path.dirname(dir), "evil.png"))).toBe(false);
  });

  it("rechaza archivo mayor al límite con 413", async () => {
    const url = await presignedUrl("products/upload-big/original.png", "image/png");
    const big = Buffer.alloc(config.uploadMaxSizeBytes + 1);

    const res = await putImage(url, big);

    expect(res.status).toBe(413);
  });

  it("responde 404 para métodos no soportados", async () => {
    const res = await request(app).post("/api/uploads/local").send({});
    expect(res.status).toBe(404);
  });
});
