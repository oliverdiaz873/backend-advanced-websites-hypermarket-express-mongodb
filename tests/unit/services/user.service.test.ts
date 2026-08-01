import * as userService from "../../../src/modules/users/services/user.service";
import { NotFoundError } from "../../../src/shared/errors/not-found.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { EmailAlreadyExistsError } from "../../../src/shared/errors/email-already-exists.error";
import { makeUser, makePublicUser, USER_ID } from "../factories/user.factory";
import { makeOrder } from "../factories/order.factory";

jest.mock("../../../src/modules/users/repositories/user.repository", () =>
  require("../mocks/repositories").mockUserRepository
);
jest.mock("../../../src/modules/orders/repositories/order.repository", () =>
  require("../mocks/repositories").mockOrderRepository
);

import { mockUserRepository, mockOrderRepository } from "../mocks/repositories";

describe("user.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAll", () => {
    it("retorna todos los usuarios sin password", async () => {
      mockUserRepository.findAll.mockResolvedValue([makeUser()]);

      const result = await userService.getAll();

      expect(mockUserRepository.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([makePublicUser()]);
      expect(result[0]).not.toHaveProperty("password");
    });
  });

  describe("getById", () => {
    it("retorna el usuario público sin password", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());

      const result = await userService.getById(USER_ID);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(makePublicUser());
    });

    it("lanza NotFoundError si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.getById(USER_ID)).rejects.toThrow(NotFoundError);
      await expect(userService.getById(USER_ID)).rejects.toThrow("User not found");
    });
  });

  describe("create", () => {
    it("normaliza el email, asigna rol customer y retorna sin password", async () => {
      const user = makeUser({ email: "oliver@example.com" });
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(user);

      const result = await userService.create({
        name: "Oliver Diaz",
        email: "  Oliver@Example.COM  ",
        password: "secret123",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("oliver@example.com");
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Oliver Diaz", email: "oliver@example.com", password: "secret123", role: "customer" })
      );
      expect(result).toEqual(makePublicUser());
      expect(result).not.toHaveProperty("password");
    });

    it("lanza EmailAlreadyExistsError si el email ya existe", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        userService.create({ name: "Oliver Diaz", email: "oliver@example.com", password: "secret123" })
      ).rejects.toThrow(EmailAlreadyExistsError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si la contraseña tiene menos de 6 caracteres", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        userService.create({ name: "Oliver Diaz", email: "oliver@example.com", password: "12345" })
      ).rejects.toThrow(InvalidDataError);
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si la contraseña está vacía", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        userService.create({ name: "Oliver Diaz", email: "oliver@example.com", password: "" })
      ).rejects.toThrow(InvalidDataError);
    });
  });

  describe("updateById", () => {
    it("lanza NotFoundError si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateById(USER_ID, { name: "Nuevo" })).rejects.toThrow(NotFoundError);
    });

    it("actualiza solo los campos permitidos y normaliza el email", async () => {
      const updated = makeUser({ name: "Nuevo", email: "nuevo@example.com" });
      mockUserRepository.findById.mockResolvedValue(makeUser());
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.updateById.mockResolvedValue(updated);

      const result = await userService.updateById(USER_ID, {
        name: "Nuevo",
        email: "  Nuevo@Example.COM  ",
        role: "admin",
      });

      expect(mockUserRepository.updateById).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ name: "Nuevo", email: "nuevo@example.com", updatedAt: expect.any(Date) })
      );
      expect(mockUserRepository.updateById.mock.calls[0][1]).not.toHaveProperty("role");
      expect(result).toEqual(makePublicUser({ name: "Nuevo", email: "nuevo@example.com" }));
    });

    it("lanza EmailAlreadyExistsError si el nuevo email pertenece a otro usuario", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());
      mockUserRepository.findByEmail.mockResolvedValue(makeUser({ id: "otro-usuario" }));

      await expect(userService.updateById(USER_ID, { email: "nuevo@example.com" })).rejects.toThrow(
        EmailAlreadyExistsError
      );
    });

    it("permite conservar el propio email sin lanzar conflicto", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());
      mockUserRepository.findByEmail.mockResolvedValue(makeUser());
      mockUserRepository.updateById.mockResolvedValue(makeUser());

      const result = await userService.updateById(USER_ID, { email: "oliver@example.com" });

      expect(result).toBeDefined();
    });

    it("lanza InvalidDataError si la nueva contraseña tiene menos de 6 caracteres", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());

      await expect(userService.updateById(USER_ID, { password: "12345" })).rejects.toThrow(InvalidDataError);
      await expect(userService.updateById(USER_ID, { password: "12345" })).rejects.toThrow(
        "Password must be at least 6 characters"
      );
    });

    it("lanza InvalidDataError si la nueva contraseña está vacía", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());

      await expect(userService.updateById(USER_ID, { password: "" })).rejects.toThrow(InvalidDataError);
      await expect(userService.updateById(USER_ID, { password: "" })).rejects.toThrow(
        "Password must be at least 6 characters"
      );
      expect(mockUserRepository.updateById).not.toHaveBeenCalled();
    });
  });

  describe("deleteById", () => {
    it("lanza NotFoundError si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteById(USER_ID)).rejects.toThrow(NotFoundError);
    });

    it("lanza InvalidDataError si el usuario tiene órdenes activas", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());
      mockOrderRepository.findByUserId.mockResolvedValue([makeOrder(), makeOrder({ status: "completed" })]);

      await expect(userService.deleteById(USER_ID)).rejects.toThrow(InvalidDataError);
      await expect(userService.deleteById(USER_ID)).rejects.toThrow("Cannot delete user with active orders");
      expect(mockUserRepository.deleteById).not.toHaveBeenCalled();
    });

    it("elimina el usuario y retorna true si no tiene órdenes activas", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());
      mockOrderRepository.findByUserId.mockResolvedValue([makeOrder({ status: "completed" })]);
      mockUserRepository.deleteById.mockResolvedValue(true);

      const result = await userService.deleteById(USER_ID);

      expect(mockOrderRepository.findByUserId).toHaveBeenCalledWith(USER_ID);
      expect(mockUserRepository.deleteById).toHaveBeenCalledWith(USER_ID);
      expect(result).toBe(true);
    });
  });
});
