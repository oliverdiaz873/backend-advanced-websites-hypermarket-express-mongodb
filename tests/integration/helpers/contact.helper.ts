import { ContactMessageModel } from "../../../src/modules/contact/models/contact-message.model";
import type { ContactMessage } from "../../../src/types";

const uniqueSuffix = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const createTestContactMessage = async (overrides: Partial<ContactMessage> = {}): Promise<ContactMessage> => {
  const suffix = uniqueSuffix();
  const message = await ContactMessageModel.create({
    name: `Cliente ${suffix}`,
    email: `cliente_${suffix}@example.com`,
    message: "Quiero saber si realizan envíos a provincia.",
    status: "pending",
    ...overrides,
  });
  return message.toJSON() as unknown as ContactMessage;
};
