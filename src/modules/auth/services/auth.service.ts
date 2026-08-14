import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import config from "../../../config";
import * as userRepository from "../../users/repositories/user.repository";
import * as userService from "../../users/services/user.service";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import { UnauthorizedError } from "../../../shared/errors/unauthorized.error";
import { EmailAlreadyExistsError } from "../../../shared/errors/email-already-exists.error";
import * as auditService from "../../audit/services/audit.service";
import type { PublicUser } from "../../../types";

export const register = async (data: { name: string; email: string; password: string }): Promise<PublicUser> => {
  const email = data.email.toLowerCase().trim();
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new EmailAlreadyExistsError();

  if (!data.password || data.password.length < 6) {
    throw new InvalidDataError("Password must be at least 6 characters");
  }

  const user = await userService.create({
    name: data.name,
    email,
    password: data.password,
  });

  void auditService.log({
    userId: user.id,
    userName: user.name,
    action: "REGISTER",
    resource: "auth",
    success: true,
    details: { email },
  });

  return user;
};

export const login = async (email: string, password: string): Promise<{ token: string; user: PublicUser }> => {
  if (!email || !password) {
    throw new InvalidDataError("Email and password are required");
  }

  const user = await userRepository.findByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError("Invalid credentials");
  }

  if (!config.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as SignOptions
  );

  const { id, name, email: userEmail, role, phone, createdAt, updatedAt } = user;
  const publicUser: PublicUser = { id, name, email: userEmail, role, phone, createdAt, updatedAt };

  void auditService.log({
    userId: user.id,
    userName: user.name,
    action: "LOGIN",
    resource: "auth",
    success: true,
  });

  return { token, user: publicUser };
};

export const getMe = async (userId: string): Promise<PublicUser> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new UnauthorizedError("User not found");
  }
  const { id, name, email, role, phone, createdAt, updatedAt } = user;
  return { id, name, email, role, phone, createdAt, updatedAt };
};

const SELF_UPDATABLE = ["name", "phone"];

/**
 * E6.1.3 - El usuario autenticado solo puede actualizarse `name` y `phone`.
 * Cualquier otra clave se rechaza con 400; el body nunca llega crudo al repositorio.
 */
export const updateMe = async (userId: string, data: Record<string, unknown>): Promise<PublicUser> => {
  const updates: Record<string, unknown> = {};

  for (const key of Object.keys(data)) {
    if (!SELF_UPDATABLE.includes(key)) {
      throw new InvalidDataError(`Only ${SELF_UPDATABLE.join(" and ")} can be updated`);
    }
    updates[key] = data[key];
  }

  if (updates.name !== undefined) {
    if (typeof updates.name !== "string" || !updates.name.trim()) {
      throw new InvalidDataError("Name must be a non-empty string");
    }
    updates.name = updates.name.trim();
  }

  if (updates.phone !== undefined) {
    if (typeof updates.phone !== "string") {
      throw new InvalidDataError("Phone must be a string");
    }
    updates.phone = updates.phone.trim();
  }

  if (Object.keys(updates).length === 0) {
    throw new InvalidDataError("Nothing to update");
  }

  return auditService.runAudited(
    { userId, action: "UPDATE_USER", resource: "user", resourceId: userId },
    async () => {
      const updated = await userRepository.updateById(userId, updates);
      if (!updated) {
        throw new UnauthorizedError("User not found");
      }
      const { id, name, email, role, phone: updatedPhone, createdAt, updatedAt } = updated;
      return { id, name, email, role, phone: updatedPhone, createdAt, updatedAt };
    },
    undefined,
    () => ({ fields: Object.keys(updates) })
  );
};
