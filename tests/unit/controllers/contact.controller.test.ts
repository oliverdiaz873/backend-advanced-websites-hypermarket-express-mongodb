import request from "supertest";
import contactRoutes from "../../../src/modules/contact/routes/contact.routes";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeContactMessage } from "../factories/contact.factory";
import { createTestApp, toJson } from "../helpers/test-app";

jest.mock("../../../src/modules/contact/services/contact.service", () =>
  require("../mocks/repositories").mockContactService
);
jest.mock("../../../src/shared/middleware/rate-limit.middleware", () => ({
  rateLimit: () => (req: unknown, res: unknown, next: () => void) => next(),
}));

import { mockContactService } from "../mocks/repositories";

const app = createTestApp("/api/contact", contactRoutes);

describe("contact.controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/contact", () => {
    it("crea el mensaje y responde 201", async () => {
      const message = makeContactMessage();
      mockContactService.create.mockResolvedValue(message);
      const body = {
        name: "Oliver Diaz",
        email: "oliver@example.com",
        message: "Quiero saber si realizan envíos a provincia.",
      };

      const res = await request(app).post("/api/contact").send(body);

      expect(mockContactService.create).toHaveBeenCalledWith(body);
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ success: true, data: toJson(message) });
    });

    it("responde 400 si faltan campos requeridos", async () => {
      const res = await request(app).post("/api/contact").send({ name: "Oliver Diaz" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Missing required fields");
    });

    it("propaga los errores de validación del service", async () => {
      mockContactService.create.mockRejectedValue(new InvalidDataError("Invalid email format"));

      const res = await request(app).post("/api/contact").send({
        name: "Oliver Diaz",
        email: "correo-invalido",
        message: "Quiero saber si realizan envíos a provincia.",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid email format");
    });
  });
});
