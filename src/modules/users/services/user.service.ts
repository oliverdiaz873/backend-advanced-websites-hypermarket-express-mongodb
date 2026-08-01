import * as userRepository from "../repositories/user.repository";
import * as orderRepository from "../../orders/repositories/order.repository";
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

export const getAll = async (): Promise<PublicUser[]> => {
  const users = await userRepository.findAll();
  return users.map(toPublicUser) as PublicUser[];
};

export const getById = async (id: string): Promise<PublicUser> => {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");
  return toPublicUser(user) as PublicUser;
};

export const create = async (data: { name: string; email: string; password: string }): Promise<PublicUser> => {
  const email = data.email.toLowerCase().trim();
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new EmailAlreadyExistsError();

  if (!data.password || data.password.length < 6) {
    throw new InvalidDataError("Password must be at least 6 characters");
  }

  const now = new Date();
  const newUser: Omit<User, "id"> = {
    name: data.name,
    email,
    password: data.password,
    role: "customer",
    createdAt: now,
    updatedAt: now,
  };

  const created = await userRepository.create(newUser);
  return toPublicUser(created) as PublicUser;
};

export const updateById = async (id: string, data: Record<string, unknown>): Promise<PublicUser> => {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");

  const updates: Record<string, unknown> = {};
  for (const key of ALLOWED_UPDATABLE) {
    if (data[key] !== undefined) {
      if (key === "email") {
        updates.email = (data[key] as string).toLowerCase().trim();
        const existing = await userRepository.findByEmail(updates.email as string);
        if (existing && existing.id !== id) throw new EmailAlreadyExistsError();
      } else {
        updates[key] = data[key];
      }
    }
  }

  if (data.password !== undefined && (data.password as string).length < 6) {
    throw new InvalidDataError("Password must be at least 6 characters");
  }

  updates.updatedAt = new Date();

  const updated = await userRepository.updateById(id, updates);
  return toPublicUser(updated) as PublicUser;
};

export const deleteById = async (id: string): Promise<boolean> => {
  const user = await userRepository.findById(id);
  if (!user) throw new NotFoundError("User not found");

  const orders = await orderRepository.findByUserId(id);
  const hasActiveOrders = orders.some((order) => order.status === "pending" || order.status === "processing");
  if (hasActiveOrders) {
    throw new InvalidDataError("Cannot delete user with active orders");
  }

  await userRepository.deleteById(id);
  return true;
};
