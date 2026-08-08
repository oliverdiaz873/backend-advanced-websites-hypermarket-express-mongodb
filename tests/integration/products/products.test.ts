import request from "supertest";
import app from "../../../src/app";
import { createTestProduct } from "../helpers/product.helper";
import { createAuthHeaders, createAuthToken } from "../helpers/auth.helper";
import { createTestAdmin } from "../helpers/user.helper";
import { createTestCategory } from "../helpers/category.helper";
import type { User } from "../../../src/types";

describe("E2E: /api/products", () => {
  it("GET / responde 200 con la lista de productos", async () => {
    const p1 = await createTestProduct({ name: "Arroz 1kg" });
    await createTestProduct({ name: "Fideos 500g" });

    const res = await request(app).get("/api/products");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.map((p: { id: string }) => p.id)).toContain(p1.id);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 50, total: 2, pages: 1 });
  });

  it("GET / respeta page y limit, y devuelve la paginación", async () => {
    await createTestProduct({ name: "Prod A" });
    await createTestProduct({ name: "Prod B" });
    await createTestProduct({ name: "Prod C" });

    const res = await request(app).get("/api/products?page=2&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });

  it("GET / no amplía el catálogo público hacia drafts/inactivos (F1)", async () => {
    await createTestProduct({ name: "Te Activo", status: "active" });
    await createTestProduct({ name: "Café Inactivo", status: "inactive", isAvailable: false });

    const inactiveOnly = await request(app).get("/api/products?status=inactive");
    expect(inactiveOnly.status).toBe(200);
    expect(inactiveOnly.body.data).toHaveLength(0);

    const activeOnly = await request(app).get("/api/products?status=active");
    expect(activeOnly.body.data.length).toBeGreaterThan(0);
    expect(activeOnly.body.data.some((p: { name: string }) => p.name === "Te Activo")).toBe(true);

    const search = await request(app).get("/api/products?q=activo");
    expect(search.status).toBe(200);
    expect(search.body.data.length).toBeGreaterThan(0);
    expect(search.body.data.some((p: { name: string }) => p.name === "Te Activo")).toBe(true);
  });

  it("GET / ordena por nombre ascendente", async () => {
    await createTestProduct({ name: "Zanahoria" });
    await createTestProduct({ name: "Almendra" });

    const res = await request(app).get("/api/products?sortBy=name&sortOrder=asc");

    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe("Almendra");
  });

  it("GET /:id responde 200 con el producto", async () => {
    const product = await createTestProduct();

    const res = await request(app).get(`/api/products/${product.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: product.id, name: product.name, price: product.price });
  });

  it("GET /:id responde 404 si el producto no existe", async () => {
    const res = await request(app).get("/api/products/prod_inexistente");

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Product not found");
  });
});

describe("E2E: visibilidad pública de productos (F1)", () => {
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
    return res.body.data as { id: string; status: string; isAvailable: boolean };
  };

  const activate = async (id: string, isAvailable: boolean, status: "active" | "inactive") => {
    const res = await request(app)
      .patch(`/api/products/${id}`)
      .set(adminHeaders)
      .send({ status, isAvailable });
    expect(res.status).toBe(200);
    return res.body.data as { status: string; isAvailable: boolean };
  };

  it("un draft no aparece en GET público ni en GET por id", async () => {
    const draft = await createDraft("Draft Oculto");
    expect(draft).toMatchObject({ status: "inactive", isAvailable: false });

    const listRes = await request(app).get("/api/products");
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);

    const byIdRes = await request(app).get(`/api/products/${draft.id}`);
    expect(byIdRes.status).toBe(404);
  });

  it("activar hace que el producto aparezca y desactivar lo oculta", async () => {
    const draft = await createDraft("Draft Toggle");

    await activate(draft.id, true, "active");

    const listAfter = await request(app).get("/api/products");
    expect(listAfter.body.data.map((p: { id: string }) => p.id)).toContain(draft.id);

    const byIdAfter = await request(app).get(`/api/products/${draft.id}`);
    expect(byIdAfter.status).toBe(200);
    expect(byIdAfter.body.data).toMatchObject({ isAvailable: true, status: "active" });

    await activate(draft.id, false, "inactive");

    const listDeactivated = await request(app).get("/api/products");
    expect(listDeactivated.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);

    const byIdDeactivated = await request(app).get(`/api/products/${draft.id}`);
    expect(byIdDeactivated.status).toBe(404);
  });

  it("estado inconsistente inactive + isAvailable:true NO aparece en público (gate conjunto)", async () => {
    const draft = await createDraft("Inconsistente");
    await activate(draft.id, true, "inactive");

    const listRes = await request(app).get("/api/products");
    expect(listRes.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);

    const inactiveQuery = await request(app).get("/api/products?status=inactive");
    expect(inactiveQuery.body.data.map((p: { id: string }) => p.id)).not.toContain(draft.id);

    const byIdRes = await request(app).get(`/api/products/${draft.id}`);
    expect(byIdRes.status).toBe(404);
  });

  it("confirmar imagen NO activa automáticamente el producto", async () => {
    const draft = await createDraft("Sin auto activacion");
    const byId = await request(app).get(`/api/products/${draft.id}`);
    expect(byId.status).toBe(404);

    await request(app).patch(`/api/products/${draft.id}`).set(adminHeaders).send({ name: "Sin auto activacion v2" }).expect(200);

    const byIdAfterEdit = await request(app).get(`/api/products/${draft.id}`);
    expect(byIdAfterEdit.status).toBe(404);
  });

  it("POST /api/products acepta translations es+en (F4 no redefine el contrato de creación)", async () => {
    const res = await request(app)
      .post("/api/products")
      .set(adminHeaders)
      .send({
        name: "Leche Entera",
        price: 120,
        categoryId,
        translations: {
          es: { name: "Leche Entera", description: "Leche entera pasteurizada." },
          en: { name: "Whole Milk", description: "Pasteurized whole milk." },
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: "inactive", isAvailable: false });
  });

  it("POST /api/products rechaza translations con name vacío", async () => {
    const res = await request(app)
      .post("/api/products")
      .set(adminHeaders)
      .send({
        name: "Leche Entera",
        price: 120,
        categoryId,
        translations: { es: { name: "  " } },
      });

    expect(res.status).toBe(400);
  });
});
