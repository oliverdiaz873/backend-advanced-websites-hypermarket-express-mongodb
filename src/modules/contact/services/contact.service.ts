import * as contactRepository from "../repositories/contact.repository";
import { InvalidDataError } from "../../../shared/errors/invalid-data.error";
import type { ContactMessage } from "../../../types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string") {
    throw new InvalidDataError(`${field} must be a string`);
  }
  return value;
};

export const create = async (data: { name?: unknown; email?: unknown; phone?: unknown; message?: unknown }): Promise<ContactMessage> => {
  const name = asString(data.name, "name").trim();
  const email = asString(data.email, "email").trim().toLowerCase();
  const message = asString(data.message, "message").trim();
  const phone = data.phone === undefined ? undefined : asString(data.phone, "phone").trim();

  if (name.length < 2 || name.length > 50) {
    throw new InvalidDataError("Name must be between 2 and 50 characters");
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new InvalidDataError("Invalid email format");
  }
  if (message.length < 10 || message.length > 500) {
    throw new InvalidDataError("Message must be between 10 and 500 characters");
  }
  if (phone && phone !== "") {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length < 8 || digits.length > 15) {
      throw new InvalidDataError("Phone must be between 8 and 15 digits");
    }
  }

  return contactRepository.create({
    name,
    email,
    phone: phone || undefined,
    message,
  });
};
