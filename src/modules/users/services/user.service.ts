import { randomUUID } from "crypto";
import * as userRepository from "../repositories/user.repository";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import { EmailAlreadyExistsError } from "../../../shared/errors/email-already-exists.error";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { User, PublicUser } from "../../../types";

const ALLOWED_UPDATABLE = ["name", "email", "password"];

const toPublicUser = (user: User | null): PublicUser | null => {
  if (!user) return null;
  const { password: _, ...publicUser } = user;
  return publicUser;
};

export const getAll = (): PublicUser[] => {
  const users = userRepository.findAll();
  return users.map(toPublicUser) as PublicUser[];
};

export const getById = (id: string): PublicUser => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user) as PublicUser;
};

export const create = (data: { name: string; email: string; password: string }): PublicUser => {
  const email = data.email.toLowerCase().trim();
  const existing = userRepository.findByEmail(email);
  if (existing) throw new EmailAlreadyExistsError();

  if (!data.password || data.password.length < 6) {
    throw new InvalidDataError("Password must be at least 6 characters");
  }

  const now = new Date();
  const newUser: User = {
    id: randomUUID(),
    name: data.name,
    email,
    password: data.password,
    role: "customer",
    createdAt: now,
    updatedAt: now,
  };

  userRepository.create(newUser);
  return toPublicUser(newUser) as PublicUser;
};

export const updateById = (id: string, data: Record<string, unknown>): PublicUser => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATABLE) {
    if (data[key] !== undefined) {
      if (key === "email") {
        updates.email = (data[key] as string).toLowerCase().trim();
        const existing = userRepository.findByEmail(updates.email as string);
        if (existing && existing.id !== id) throw new EmailAlreadyExistsError();
      } else {
        updates[key] = data[key];
      }
    }
  }

  if (data.password && (data.password as string).length < 6) {
    throw new InvalidDataError("Password must be at least 6 characters");
  }

  updates.updatedAt = new Date();

  const updated = userRepository.updateById(id, updates);
  return toPublicUser(updated) as PublicUser;
};

export const deleteById = (id: string): boolean => {
  const user = userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");
  userRepository.deleteById(id);
  return true;
};
