import request from "supertest";
import app from "../../../src/app";
import { createTestProduct } from "../helpers/product.helper";
import { createAuthHeaders, createAuthToken } from "../helpers/auth.helper";
import { createTestAdmin } from "../helpers/user.helper";
import { createTestCategory } from "../helpers/category.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/search", () => {
  it("GET /?q= busca y responde 200", async () => {
    await createTestProduct({ name: "Arroz 1kg" });
    await createTestProduct({ name: "Fideos 500g" });

    const res = await request(app).get("/api/search").query({ q: "arroz" });

    expect(res.status).toBe(200);
    expect(res.body.data.map((p: { name: string }) => p.name)).toContain("Arroz 1kg");
  });

  it("GET /?q=&category= filtra por categoría", async () => {
    await createTestProduct({
      name: "Arroz 1kg",
      category: { name: "Granos", slug: "granos" },
      categoryId: "cat_granos",
    });

    const res = await request(app).get("/api/search").query({ q: "arroz", category: "granos" });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("responde 400 si falta el término de búsqueda", async () => {
    const res = await request(app).get("/api/search");

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Search term is required");
  });

  it("responde 200 si no hay coincidencias", async () => {
    const res = await request(app).get("/api/search").query({ q: "inexistente" });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe("E2E: /api/search visibilidad pública (F1)", () => {
  let admin: User;
  let adminHeaders: { Authorization: string };
  let categoryId: string;

  beforeEach(async () => {
    admin = await createTestAdmin();
    adminHeaders = createAuthHeaders(createAuthToken(admin));
    categoryId = (await createTestCategory()).id;
  });

  const createDraft = async (name: string) => {
    const res = await request(app)
      .post("/api/products")
      .set(adminHeaders)
      .send({ name, price: 50, categoryId });
    expect(res.status).toBe(201);
    return res.body.data as { id: string };
  };

  it("un draft no aparece en search; al activarlo sí, y sin campos internos", async () => {
    const draft = await createDraft("Cereal Buscar");

    const hidden = await request(app).get("/api/search").query({ q: "cereal" });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);

    await request(app)
      .patch(`/api/products/${draft.id}`)
      .set(adminHeaders)
      .send({ status: "active", isAvailable: true })
      .expect(200);

    const found = await request(app).get("/api/search").query({ q: "cereal" });
    expect(found.status).toBe(200);
    expect(found.body.data.map((p: { id: string }) => p.id)).toContain(draft.id);

    const item = found.body.data.find((p: { id: string }) => p.id === draft.id);
    expect(item).not.toHaveProperty("imageKey");
    expect(item).not.toHaveProperty("imageThumbnailKey");
    expect(item).not.toHaveProperty("translations");
    expect(item).not.toHaveProperty("__v");
  });

  it("estado inconsistente inactive + isAvailable:true no aparece en search", async () => {
    const draft = await createDraft("Fideos Oculto");
    await request(app)
      .patch(`/api/products/${draft.id}`)
      .set(adminHeaders)
      .send({ status: "inactive", isAvailable: true })
      .expect(200);

    const res = await request(app).get("/api/search").query({ q: "fideos" });
    expect(res.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);
  });

  it("?lang resolve la traducción sin exponer el bloque translations", async () => {
    const draft = await createDraft("Galletas Buscar");
    await request(app)
      .patch(`/api/products/${draft.id}`)
      .set(adminHeaders)
      .send({
        status: "active",
        isAvailable: true,
        translations: { en: { name: "Search Cookies", description: "EN description" } },
      })
      .expect(200);

    const res = await request(app).get("/api/search").query({ q: "galletas", lang: "en" });
    const item = res.body.data.find((p: { id: string }) => p.id === draft.id);
    expect(item).toBeDefined();
    expect(item.name).toBe("Search Cookies");
    expect(item).not.toHaveProperty("translations");
  });

  it("?lang=en sin translations.en devuelve el nombre root (fallback ES)", async () => {
    const draft = await createDraft("Galletas Sin Traduccion");
    await request(app)
      .patch(`/api/products/${draft.id}`)
      .set(adminHeaders)
      .send({ status: "active", isAvailable: true })
      .expect(200);

    const res = await request(app).get("/api/search").query({ q: "galletas", lang: "en" });
    const item = res.body.data.find((p: { id: string }) => p.id === draft.id);
    expect(item).toBeDefined();
    expect(item.name).toBe("Galletas Sin Traduccion");
  });
});
