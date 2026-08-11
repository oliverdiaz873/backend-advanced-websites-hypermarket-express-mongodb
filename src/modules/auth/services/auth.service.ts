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

  const { password: _, ...publicUser } = user;

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
  const { password: _, ...publicUser } = user;
  return publicUser;
};
