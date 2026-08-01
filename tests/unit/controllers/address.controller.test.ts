import request from "supertest";
import addressRoutes from "../../../src/modules/addresses/routes/address.routes";
import { makeAddress, ADDRESS_ID } from "../factories/address.factory";
import { USER_ID } from "../factories/user.factory";
import { createTestApp, createAuthToken, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/addresses/services/address.service", () =>
  require("../mocks/repositories").mockAddressService
);

import { mockAddressService } from "../mocks/repositories";

const app = createTestApp("/api/addresses", addressRoutes);
const authToken = createAuthToken({ id: USER_ID, email: "oliver@example.com", role: "customer" });

describe("address.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("responde 401 sin token", async () => {
    const res = await request(app).get("/api/addresses");

    expect(res.status).toBe(401);
  });

  describe("GET /api/addresses", () => {
    it("responde 200 con las direcciones del usuario autenticado", async () => {
      const addresses = [makeAddress()];
      mockAddressService.getByUser.mockResolvedValue(addresses);

      const res = await request(app).get("/api/addresses").set("Authorization", `Bearer ${authToken}`);

      expect(mockAddressService.getByUser).toHaveBeenCalledWith(USER_ID, USER_ID, "customer");
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, data: toJson(addresses) });
    });
  });

  describe("GET /api/addresses/user/:userId", () => {
    it("responde 200 con las direcciones del usuario solicitado", async () => {
      const addresses = [makeAddress()];
      mockAddressService.getByUser.mockResolvedValue(addresses);

      const res = await request(app)
        .get(`/api/addresses/user/${USER_ID}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(mockAddressService.getByUser).toHaveBeenCalledWith(USER_ID, USER_ID, "customer");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/addresses/:id", () => {
    it("responde 200 con la dirección", async () => {
      const address = makeAddress();
      mockAddressService.getById.mockResolvedValue(address);

      const res = await request(app).get(`/api/addresses/${ADDRESS_ID}`).set("Authorization", `Bearer ${authToken}`);

      expect(mockAddressService.getById).toHaveBeenCalledWith(ADDRESS_ID, USER_ID, "customer");
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(address));
    });
  });

  describe("POST /api/addresses", () => {
    it("responde 400 si faltan campos requeridos", async () => {
      const res = await request(app)
        .post("/api/addresses")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ label: "Casa" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Missing required fields");
    });

    it("crea la dirección y responde 201", async () => {
      const address = makeAddress();
      mockAddressService.create.mockResolvedValue(address);
      const body = {
        label: "Casa", street: "Av. Siempre Viva 123", city: "Lima", state: "Lima", zipCode: "15001", country: "Perú",
      };

      const res = await request(app).post("/api/addresses").set("Authorization", `Bearer ${authToken}`).send(body);

      expect(mockAddressService.create).toHaveBeenCalledWith(USER_ID, body);
      expect(res.status).toBe(201);
      expect(res.body.data).toEqual(toJson(address));
    });
  });

  describe("PATCH /api/addresses/:id", () => {
    it("actualiza la dirección y responde 200", async () => {
      const updated = makeAddress({ label: "Trabajo" });
      mockAddressService.updateById.mockResolvedValue(updated);

      const res = await request(app)
        .patch(`/api/addresses/${ADDRESS_ID}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ label: "Trabajo" });

      expect(mockAddressService.updateById).toHaveBeenCalledWith(USER_ID, ADDRESS_ID, { label: "Trabajo" });
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(toJson(updated));
    });
  });

  describe("DELETE /api/addresses/:id", () => {
    it("elimina la dirección y responde 204", async () => {
      mockAddressService.deleteById.mockResolvedValue(true);

      const res = await request(app).delete(`/api/addresses/${ADDRESS_ID}`).set("Authorization", `Bearer ${authToken}`);

      expect(mockAddressService.deleteById).toHaveBeenCalledWith(USER_ID, ADDRESS_ID);
      expect(res.status).toBe(204);
    });
  });
});
