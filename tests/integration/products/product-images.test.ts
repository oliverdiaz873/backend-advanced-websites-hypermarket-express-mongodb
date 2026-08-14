import request from "supertest";
import fs from "fs";
import path from "path";
import app from "../../../src/app";
import config from "../../../src/config";
import { LocalStorageProvider } from "../../../src/shared/storage/local.provider";
import { getStorageProvider, resetStorageProvider } from "../../../src/shared/storage/storage.factory";
import { createAuthHeaders, createAuthToken } from "../helpers/auth.helper";
import { createTestAdmin } from "../helpers/user.helper";
import { createTestCategory } from "../helpers/category.helper";
import type { User } from "../../../src/types";

/**
 * Flujo F1 completo con el proveedor local real:
 * POST /api/products (draft) -> presign -> upload directo -> PATCH imageKey
 * -> activar -> reemplazar (borrado de la anterior) -> borrar (deletePrefix).
 */
describe("E2E: flujo de imagen de producto (F1)", () => {
  const storageDir = config.storageLocalDir;
  let admin: User;
  let adminHeaders: { Authorization: string };
  let categoryId: string;

  beforeAll(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
    fs.mkdirSync(storageDir, { recursive: true });
  });

  beforeEach(async () => {
    admin = await createTestAdmin();
    adminHeaders = createAuthHeaders(createAuthToken(admin));
    const category = await createTestCategory();
    categoryId = category.id;
    resetStorageProvider();
    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  afterAll(() => {
    fs.rmSync(storageDir, { recursive: true, force: true });
    resetStorageProvider();
  });

  const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x28, 0x00, 0x00, 0x00]), Buffer.from("WEBP"), Buffer.alloc(8)]);

  const putUpload = async (uploadUrl: string, body: Buffer) => {
    const url = new URL(uploadUrl);
    return request(app)
      .put(`/api/uploads/local${url.search}`)
      .set("Content-Type", url.searchParams.get("contentType") as string)
      .send(body);
  };

  const createDraft = async (name = "CafÃ© Premium") => {
    const res = await request(app)
      .post("/api/products")
      .set(adminHeaders)
      .send({ name, price: 150, categoryId });
    expect(res.status).toBe(201);
    return res.body.data as { id: string };
  };

  const presign = async (productId: string, fileName: string) => {
    const res = await request(app)
      .post("/api/admin/uploads/presigned")
      .set(adminHeaders)
      .send({ productId, fileName, contentType: "image/webp", purpose: "product" });
    expect(res.status).toBe(200);
    return res.body.data as {
      key: string;
      uploadUrl: string;
      publicUrl: string;
      expiresInSeconds: number;
      productId: string;
      purpose: string;
    };
  };

  it("sube, confirma, activa y sirve la imagen con cache-busting", async () => {
    const { id } = await createDraft();

    const signed = await presign(id, "cafe.webp");
    expect(signed.key).toMatch(new RegExp(`^products/${id}/[0-9a-f-]{36}\\.webp$`));

    const upload = await putUpload(signed.uploadUrl, WEBP);
    expect(upload.status).toBe(200);
    expect(fs.existsSync(path.join(storageDir, signed.key))).toBe(true);

    const confirmed = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ imageKey: signed.key });

    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.image).toContain(`/uploads/${signed.key}`);
    expect(confirmed.body.data.image).toContain("?v=");
    expect(confirmed.body.data).not.toHaveProperty("imageKey");
    expect(confirmed.body.data).not.toHaveProperty("translations");

    const activated = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ status: "active", isAvailable: true });
    expect(activated.status).toBe(200);
    expect(activated.body.data).toMatchObject({ status: "active", isAvailable: true });

    const viewed = await request(app).get(`/api/products/${id}`);
    expect(viewed.status).toBe(200);
    expect(viewed.body.data.image).toContain(`${signed.key}`);
  });

  it("reemplazar la imagen borra la anterior y conserva la nueva", async () => {
    const { id } = await createDraft();

    const first = await presign(id, "a.webp");
    expect((await putUpload(first.uploadUrl, WEBP)).status).toBe(200);
    await request(app).patch(`/api/products/${id}`).set(adminHeaders).send({ imageKey: first.key }).expect(200);

    const second = await presign(id, "b.webp");
    expect((await putUpload(second.uploadUrl, WEBP)).status).toBe(200);
    const replaced = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ imageKey: second.key });

    expect(replaced.status).toBe(200);
    expect(replaced.body.data.image).toContain(second.key);
    expect(fs.existsSync(path.join(storageDir, first.key))).toBe(false);
    expect(fs.existsSync(path.join(storageDir, second.key))).toBe(true);
  });

  it("una imageKey invÃ¡lida se rechaza con 400/404", async () => {
    const { id } = await createDraft();

    const cross = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ imageKey: `products/otro-producto/x.webp` });
    expect(cross.status).toBe(400);

    const missing = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ imageKey: `products/${id}/no-existe.webp` });
    expect(missing.status).toBe(404);
  });

  it("borrar el producto elimina su prefijo de imÃ¡genes", async () => {
    const { id } = await createDraft();
    const signed = await presign(id, "borrar.webp");
    await putUpload(signed.uploadUrl, WEBP);
    await request(app).patch(`/api/products/${id}`).set(adminHeaders).send({ imageKey: signed.key }).expect(200);

    const del = await request(app).delete(`/api/products/${id}`).set(adminHeaders);
    expect(del.status).toBe(204);
    expect(fs.existsSync(path.join(storageDir, "products", id))).toBe(true);
  });
});