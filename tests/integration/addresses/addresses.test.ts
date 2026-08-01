import request from "supertest";
import app from "../../../src/app";
import { createAuthToken, createAuthHeaders } from "../helpers/auth.helper";
import { createTestAdmin, createTestUser } from "../helpers/user.helper";
import { createTestAddress } from "../helpers/address.helper";
import type { User } from "../../../src/types";

const validAddress = {
  label: "Casa",
  street: "Av. Principal 123",
  city: "Lima",
  state: "Lima",
  zipCode: "15001",
  country: "Peru",
};

describe("E2E: /api/addresses", () => {
  let owner: User;
  let other: User;
  let admin: User;
  let ownerHeaders: { Authorization: string };
  let otherHeaders: { Authorization: string };
  let adminHeaders: { Authorization: string };

  beforeEach(async () => {
    owner = await createTestUser();
    other = await createTestUser();
    admin = await createTestAdmin();
    ownerHeaders = createAuthHeaders(createAuthToken(owner));
    otherHeaders = createAuthHeaders(createAuthToken(other));
    adminHeaders = createAuthHeaders(createAuthToken(admin));
  });

  it("POST / crea una dirección y la primera queda como default", async () => {
    const res = await request(app).post("/api/addresses").set(ownerHeaders).send(validAddress);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ label: "Casa", city: "Lima", isDefault: true });
  });

  it("POST / responde 400 si faltan campos", async () => {
    const res = await request(app).post("/api/addresses").set(ownerHeaders).send({ label: "Casa" });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Missing required fields");
  });

  it("POST / responde 400 si isDefault no es booleano", async () => {
    const res = await request(app)
      .post("/api/addresses")
      .set(ownerHeaders)
      .send({ ...validAddress, isDefault: "si" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("isDefault must be a boolean");
  });

  it("GET / lista las direcciones del usuario", async () => {
    await createTestAddress(owner.id);
    await createTestAddress(owner.id);

    const res = await request(app).get("/api/addresses").set(ownerHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("GET /:id devuelve la dirección propia", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).get(`/api/addresses/${address.id}`).set(ownerHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(address.id);
  });

  it("GET /:id de otro usuario responde 404 (no filtra existencia)", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).get(`/api/addresses/${address.id}`).set(otherHeaders);

    expect(res.status).toBe(404);
  });

  it("GET /user/:userId de otro usuario responde 403 para customer", async () => {
    const res = await request(app).get(`/api/addresses/user/${owner.id}`).set(otherHeaders);

    expect(res.status).toBe(403);
  });

  it("GET /user/:userId responde 200 para admin", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).get(`/api/addresses/user/${owner.id}`).set(adminHeaders);

    expect(res.status).toBe(200);
    expect(res.body.data.map((a: { id: string }) => a.id)).toContain(address.id);
  });

  it("PATCH /:id actualiza la dirección propia", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app)
      .patch(`/api/addresses/${address.id}`)
      .set(ownerHeaders)
      .send({ street: "Av. Nueva 456" });

    expect(res.status).toBe(200);
    expect(res.body.data.street).toBe("Av. Nueva 456");
  });

  it("PATCH /:id de otro usuario responde 404", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).patch(`/api/addresses/${address.id}`).set(otherHeaders).send({ label: "X" });

    expect(res.status).toBe(404);
  });

  it("DELETE /:id elimina la dirección propia con 204", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).delete(`/api/addresses/${address.id}`).set(ownerHeaders);

    expect(res.status).toBe(204);
  });

  it("DELETE /:id de otro usuario responde 404", async () => {
    const address = await createTestAddress(owner.id);

    const res = await request(app).delete(`/api/addresses/${address.id}`).set(otherHeaders);

    expect(res.status).toBe(404);
  });
});
