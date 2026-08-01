import { UserModel } from "../../../src/modules/users/models/user.model";
import type { User } from "../../../src/types";

const uniqueEmail = (): string =>
  `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@example.com`;

export const createTestUser = async (overrides: Partial<User> = {}): Promise<User> => {
  const { id, ...rest } = overrides;
  const user = await UserModel.create({
    name: "Oliver Diaz",
    email: uniqueEmail(),
    password: "secret123",
    role: "customer",
    ...rest,
  });
  return user.toJSON() as unknown as User;
};

export const createTestAdmin = async (overrides: Partial<User> = {}): Promise<User> =>
  createTestUser({ role: "admin", ...overrides });
