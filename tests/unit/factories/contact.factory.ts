import type { ContactMessage } from "../../../src/types";

export const CONTACT_ID = "64b00000000000000000002001";

export const makeContactMessage = (overrides: Partial<ContactMessage> = {}): ContactMessage => ({
  id: CONTACT_ID,
  name: "Oliver Diaz",
  email: "oliver@example.com",
  phone: "999888777",
  message: "Quiero saber si realizan envíos a provincia.",
  status: "pending",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
});
