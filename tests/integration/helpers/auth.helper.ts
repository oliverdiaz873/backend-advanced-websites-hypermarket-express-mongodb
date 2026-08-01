import jwt from "jsonwebtoken";
import config from "../../../src/config";
import type { User } from "../../../src/types";

export const createAuthToken = (user: Pick<User, "id" | "email" | "role">): string =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn } as jwt.SignOptions
  );

export const createAuthHeaders = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});
