import type { Address } from "../../../src/types";
import { USER_ID } from "./user.factory";

export const ADDRESS_ID = "64b0000000000000000000e1";

export const makeAddress = (overrides: Partial<Address> = {}): Address => ({
  id: ADDRESS_ID,
  userId: USER_ID,
  label: "Casa",
  street: "Av. Siempre Viva 123",
  city: "Lima",
  state: "Lima",
  zipCode: "15001",
  country: "Perú",
  reference: "Cerca del parque",
  isDefault: true,
  ...overrides,
});
