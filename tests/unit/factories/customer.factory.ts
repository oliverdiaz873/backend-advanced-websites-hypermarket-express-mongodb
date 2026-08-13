import type { Customer, CustomerAddress, CustomerStats } from "../../../src/types";

export const CUSTOMER_ID = "64b000000000000000000002";
export const CUSTOMER_ID_2 = "64b000000000000000000003";

export const makeCustomerAddress = (overrides: Partial<CustomerAddress> = {}): CustomerAddress => ({
  street: "Av. Principal 123",
  city: "Santo Domingo",
  state: "DN",
  zipCode: "10101",
  country: "DO",
  ...overrides,
});

export const makeCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: CUSTOMER_ID,
  name: "Oliver Diaz",
  email: "oliver@example.com",
  phone: "809-555-5555",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});

export const makeCustomerStats = (overrides: Partial<CustomerStats> = {}): CustomerStats => ({
  total: 10,
  active: 8,
  blocked: 1,
  pending: 1,
  newThisMonth: 2,
  ...overrides,
});