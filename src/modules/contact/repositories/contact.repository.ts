import { ContactMessageModel } from "../models/contact-message.model";
import type { ContactMessage } from "../../../types";

export const create = async (data: Omit<ContactMessage, "id" | "status" | "createdAt" | "updatedAt">): Promise<ContactMessage> => {
  const doc = await ContactMessageModel.create(data);
  return doc.toJSON() as unknown as ContactMessage;
};
