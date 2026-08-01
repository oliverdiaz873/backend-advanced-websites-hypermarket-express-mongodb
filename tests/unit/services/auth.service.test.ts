import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../../../src/config";
import * as authService from "../../../src/modules/auth/services/auth.service";
import { EmailAlreadyExistsError } from "../../../src/shared/errors/email-already-exists.error";
import { InvalidDataError } from "../../../src/shared/errors/invalid-data.error";
import { makeUser, makePublicUser, USER_ID } from "../factories/user.factory";

jest.mock("../../../src/config", () => ({
  __esModule: true,
  default: {
    port: 3001,
    nodeEnv: "test",
    jwtSecret: "hypermarket_test_secret_2026",
    jwtExpiresIn: "1h",
    corsOrigin: [],
    mongodbUri: "",
  },
}));
jest.mock("../../../src/modules/users/repositories/user.repository", () =>
  require("../mocks/repositories").mockUserRepository
);
jest.mock("../../../src/modules/users/services/user.service", () =>
  require("../mocks/repositories").mockUserService
);
jest.mock("bcryptjs", () => ({ __esModule: true, default: { compare: jest.fn() } }));
jest.mock("jsonwebtoken", () => ({ __esModule: true, default: { sign: jest.fn() } }));

import { mockUserRepository, mockUserService } from "../mocks/repositories";

const mockCompare = bcrypt.compare as jest.Mock;
const mockSign = jwt.sign as jest.Mock;

describe("auth.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.jwtSecret = "hypermarket_test_secret_2026";
  });

  describe("register", () => {
    it("normaliza el email y delega en userService.create", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);
      const publicUser = makePublicUser();
      mockUserService.create.mockResolvedValue(publicUser);

      const result = await authService.register({
        name: "Oliver Diaz",
        email: "  Oliver@Example.COM  ",
        password: "secret123",
      });

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("oliver@example.com");
      expect(mockUserService.create).toHaveBeenCalledWith({
        name: "Oliver Diaz",
        email: "oliver@example.com",
        password: "secret123",
      });
      expect(result).toEqual(publicUser);
    });

    it("lanza EmailAlreadyExistsError si el email ya está registrado", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(makeUser());

      await expect(
        authService.register({ name: "Oliver Diaz", email: "oliver@example.com", password: "secret123" })
      ).rejects.toThrow(EmailAlreadyExistsError);
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si la contraseña tiene menos de 6 caracteres", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.register({ name: "Oliver Diaz", email: "oliver@example.com", password: "12345" })
      ).rejects.toThrow(InvalidDataError);
      await expect(
        authService.register({ name: "Oliver Diaz", email: "oliver@example.com", password: "12345" })
      ).rejects.toThrow("Password must be at least 6 characters");
      expect(mockUserService.create).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si la contraseña está vacía", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.register({ name: "Oliver Diaz", email: "oliver@example.com", password: "" })
      ).rejects.toThrow(InvalidDataError);
    });
  });

  describe("login", () => {
    it("lanza InvalidDataError si falta el email", async () => {
      await expect(authService.login("", "secret123")).rejects.toThrow(InvalidDataError);
      await expect(authService.login("", "secret123")).rejects.toThrow("Email and password are required");
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si falta la contraseña", async () => {
      await expect(authService.login("oliver@example.com", "")).rejects.toThrow(InvalidDataError);
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("lanza InvalidDataError si el usuario no existe", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(authService.login("oliver@example.com", "secret123")).rejects.toThrow(InvalidDataError);
      await expect(authService.login("oliver@example.com", "secret123")).rejects.toThrow("Invalid credentials");
    });

    it("lanza InvalidDataError si la contraseña no coincide", async () => {
      mockUserRepository.findByEmail.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValue(false);

      await expect(authService.login("oliver@example.com", "wrong-pass")).rejects.toThrow(InvalidDataError);
      await expect(authService.login("oliver@example.com", "wrong-pass")).rejects.toThrow("Invalid credentials");
    });

    it("retorna token y usuario sin password con credenciales válidas", async () => {
      const user = makeUser();
      mockUserRepository.findByEmail.mockResolvedValue(user);
      mockCompare.mockResolvedValue(true);
      mockSign.mockReturnValue("token-abc");

      const result = await authService.login("Oliver@Example.COM ", "secret123");

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith("oliver@example.com");
      expect(mockSign).toHaveBeenCalledWith(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );
      expect(result).toEqual({ token: "token-abc", user: expect.not.objectContaining({ password: expect.any(String) }) });
    });

    it("lanza Error si JWT_SECRET no está configurado", async () => {
      config.jwtSecret = "";
      mockUserRepository.findByEmail.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValue(true);

      await expect(authService.login("oliver@example.com", "secret123")).rejects.toThrow("JWT_SECRET is not configured");
    });
  });

  describe("getMe", () => {
    it("retorna el usuario público sin password", async () => {
      mockUserRepository.findById.mockResolvedValue(makeUser());

      const result = await authService.getMe(USER_ID);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(USER_ID);
      expect(result).toEqual(makePublicUser());
      expect(result).not.toHaveProperty("password");
    });

    it("lanza InvalidDataError si el usuario no existe", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getMe(USER_ID)).rejects.toThrow(InvalidDataError);
      await expect(authService.getMe(USER_ID)).rejects.toThrow("User not found");
    });
  });
});
