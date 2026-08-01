import type { PublicUser, User } from "../../../src/types";

export const USER_ID = "64b000000000000000000001";

export const makeUser = (overrides: Partial<User> = {}): User => ({
  id: USER_ID,
  name: "Oliver Diaz",
  email: "oliver@example.com",
  password: "$2a$10$abcdefghijklmnopqrstuvABCDEFGHIJKLMNOPQRSTUVWXYZ0123",
  role: "customer",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

export const makePublicUser = (overrides: Partial<PublicUser> = {}): PublicUser => {
  const { password: _password, ...publicUser } = makeUser(overrides);
  return publicUser;
};
