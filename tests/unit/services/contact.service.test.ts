import * as contactService from "../../../src/modules/contact/services/contact.service";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeContactMessage } from "../factories/contact.factory";

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
});
