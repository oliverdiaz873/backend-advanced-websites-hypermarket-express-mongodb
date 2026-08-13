import { UserModel } from "../../../src/modules/users/models/user.model";
import type { Customer } from "../../../src/types";

const uniqueEmail = (): string =>
  `customer_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@example.com`;

export const createTestCustomer = async (overrides: Partial<Customer> = {}): Promise<Customer> => {
  const { id, ...rest } = overrides;
  const doc = await UserModel.create({
    name: "Cliente Test",
    email: uniqueEmail(),
    password: "secret123",
    role: "customer",
    status: "active",
    ...rest,
  });
  const raw = doc.toJSON() as Customer & { password: string; role: "customer" | "admin" };
  const { password: _password, role: _role, ...customer } = raw;
  return customer;
};
