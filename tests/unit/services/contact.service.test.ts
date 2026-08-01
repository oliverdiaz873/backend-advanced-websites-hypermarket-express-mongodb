import * as contactService from "../../../src/modules/contact/services/contact.service";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { makeContactMessage, CONTACT_ID } from "../factories/contact.factory";

jest.mock("../../../src/modules/contact/repositories/contact.repository", () =>
  require("../mocks/repositories").mockContactRepository
);

import { mockContactRepository } from "../mocks/repositories";

describe("contact.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lanza InvalidDataError si un campo requerido no es string", async () => {
    await expect(
      contactService.create({ name: 123, email: "oliver@example.com", message: "Mensaje de prueba válido" })
    ).rejects.toThrow(InvalidDataError);
    await expect(
      contactService.create({ name: 123, email: "oliver@example.com", message: "Mensaje de prueba válido" })
    ).rejects.toThrow("name must be a string");
  });

  it("lanza InvalidDataError si el nombre tiene menos de 2 caracteres", async () => {
    await expect(
      contactService.create({ name: "O", email: "oliver@example.com", message: "Mensaje de prueba válido" })
    ).rejects.toThrow(InvalidDataError);
    await expect(
      contactService.create({ name: "O", email: "oliver@example.com", message: "Mensaje de prueba válido" })
    ).rejects.toThrow("Name must be between 2 and 50 characters");
  });

  it("lanza InvalidDataError si el nombre tiene más de 50 caracteres", async () => {
    await expect(
      contactService.create({ name: "a".repeat(51), email: "oliver@example.com", message: "Mensaje de prueba válido" })
    ).rejects.toThrow(InvalidDataError);
  });

  it("lanza InvalidDataError si el email no tiene formato válido", async () => {
    await expect(
      contactService.create({ name: "Oliver", email: "correo-invalido", message: "Mensaje de prueba válido" })
    ).rejects.toThrow(InvalidDataError);
    await expect(
      contactService.create({ name: "Oliver", email: "correo-invalido", message: "Mensaje de prueba válido" })
    ).rejects.toThrow("Invalid email format");
  });

  it("lanza InvalidDataError si el mensaje tiene menos de 10 caracteres", async () => {
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "corto" })
    ).rejects.toThrow(InvalidDataError);
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "corto" })
    ).rejects.toThrow("Message must be between 10 and 500 characters");
  });

  it("lanza InvalidDataError si el mensaje tiene más de 500 caracteres", async () => {
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "a".repeat(501) })
    ).rejects.toThrow(InvalidDataError);
  });

  it("lanza InvalidDataError si el teléfono tiene menos de 8 dígitos", async () => {
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "Mensaje de prueba válido", phone: "1234567" })
    ).rejects.toThrow(InvalidDataError);
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "Mensaje de prueba válido", phone: "1234567" })
    ).rejects.toThrow("Phone must be between 8 and 15 digits");
  });

  it("lanza InvalidDataError si el teléfono tiene más de 15 dígitos", async () => {
    await expect(
      contactService.create({ name: "Oliver", email: "oliver@example.com", message: "Mensaje de prueba válido", phone: "1".repeat(16) })
    ).rejects.toThrow(InvalidDataError);
  });

  it("crea el mensaje normalizando nombre, email, mensaje y teléfono", async () => {
    const created = makeContactMessage();
    mockContactRepository.create.mockResolvedValue(created);

    const result = await contactService.create({
      name: "  Oliver Diaz  ",
      email: "  OLIVER@Example.COM  ",
      message: "  Quiero saber si realizan envíos a provincia.  ",
      phone: "999-888-777",
    });

    expect(mockContactRepository.create).toHaveBeenCalledWith({
      name: "Oliver Diaz",
      email: "oliver@example.com",
      message: "Quiero saber si realizan envíos a provincia.",
      phone: "999-888-777",
    });
    expect(result).toEqual(created);
  });

  it("crea el mensaje sin teléfono cuando no se envía", async () => {
    const created = makeContactMessage();
    mockContactRepository.create.mockResolvedValue(created);

    await contactService.create({
      name: "Oliver Diaz",
      email: "oliver@example.com",
      message: "Mensaje de prueba válido",
    });

    expect(mockContactRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: undefined })
    );
  });

  it("crea el mensaje sin teléfono cuando se envía vacío", async () => {
    mockContactRepository.create.mockResolvedValue(makeContactMessage());

    await contactService.create({
      name: "Oliver Diaz",
      email: "oliver@example.com",
      message: "Mensaje de prueba válido",
      phone: "",
    });

    expect(mockContactRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: undefined })
    );
  });

  describe("findAllAdmin", () => {
    it("retorna todos los mensajes", async () => {
      const messages = [makeContactMessage(), makeContactMessage({ id: "64b00000000000000000002002" })];
      mockContactRepository.findAll.mockResolvedValue(messages);

      const result = await contactService.findAllAdmin();

      expect(mockContactRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(messages);
    });
  });

  describe("findByIdAdmin", () => {
    it("retorna el mensaje si existe", async () => {
      const message = makeContactMessage();
      mockContactRepository.findById.mockResolvedValue(message);

      const result = await contactService.findByIdAdmin(CONTACT_ID);

      expect(mockContactRepository.findById).toHaveBeenCalledWith(CONTACT_ID);
      expect(result).toEqual(message);
    });

    it("lanza NotFoundError si no existe", async () => {
      mockContactRepository.findById.mockResolvedValue(null);

      await expect(contactService.findByIdAdmin(CONTACT_ID)).rejects.toThrow(NotFoundError);
      await expect(contactService.findByIdAdmin(CONTACT_ID)).rejects.toThrow("Contact message not found");
    });
  });

  describe("updateStatusAdmin", () => {
    it("lanza NotFoundError si el mensaje no existe", async () => {
      mockContactRepository.findById.mockResolvedValue(null);

      await expect(contactService.updateStatusAdmin(CONTACT_ID, "read")).rejects.toThrow(NotFoundError);
    });

    it("lanza InvalidDataError en transiciones inválidas", async () => {
      mockContactRepository.findById.mockResolvedValue(makeContactMessage({ status: "answered" }));

      await expect(contactService.updateStatusAdmin(CONTACT_ID, "pending")).rejects.toThrow(InvalidDataError);
      await expect(contactService.updateStatusAdmin(CONTACT_ID, "pending")).rejects.toThrow(
        "Cannot transition from answered to pending"
      );
      expect(mockContactRepository.updateById).not.toHaveBeenCalled();
    });

    it("actualiza pending → read", async () => {
      const updated = makeContactMessage({ status: "read" });
      mockContactRepository.findById.mockResolvedValue(makeContactMessage());
      mockContactRepository.updateById.mockResolvedValue(updated);

      const result = await contactService.updateStatusAdmin(CONTACT_ID, "read");

      expect(mockContactRepository.updateById).toHaveBeenCalledWith(
        CONTACT_ID,
        expect.objectContaining({ status: "read", updatedAt: expect.any(Date) })
      );
      expect(result).toEqual(updated);
    });

    it("actualiza pending → answered y read → answered", async () => {
      mockContactRepository.findById.mockResolvedValue(makeContactMessage());
      mockContactRepository.updateById.mockResolvedValue(makeContactMessage({ status: "answered" }));

      await contactService.updateStatusAdmin(CONTACT_ID, "answered");
      expect(mockContactRepository.updateById).toHaveBeenCalledWith(
        CONTACT_ID,
        expect.objectContaining({ status: "answered" })
      );

      jest.clearAllMocks();
      mockContactRepository.findById.mockResolvedValue(makeContactMessage({ status: "read" }));
      mockContactRepository.updateById.mockResolvedValue(makeContactMessage({ status: "answered" }));

      await contactService.updateStatusAdmin(CONTACT_ID, "answered");
      expect(mockContactRepository.updateById).toHaveBeenCalledWith(
        CONTACT_ID,
        expect.objectContaining({ status: "answered" })
      );
    });
  });

  describe("remove", () => {
    it("borra el mensaje si existe", async () => {
      mockContactRepository.findById.mockResolvedValue(makeContactMessage());
      mockContactRepository.deleteById.mockResolvedValue(true);

      await expect(contactService.remove(CONTACT_ID)).resolves.toBeUndefined();
      expect(mockContactRepository.deleteById).toHaveBeenCalledWith(CONTACT_ID);
    });

    it("lanza NotFoundError si no existe", async () => {
      mockContactRepository.findById.mockResolvedValue(null);

      await expect(contactService.remove(CONTACT_ID)).rejects.toThrow(NotFoundError);
      expect(mockContactRepository.deleteById).not.toHaveBeenCalled();
    });
  });
});
