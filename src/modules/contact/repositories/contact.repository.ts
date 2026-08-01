import { ContactMessageModel } from "../models/contact-message.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import type { ContactMessage, ContactMessageStatus } from "../../../types";

export const create = async (data: Omit<ContactMessage, "id" | "status" | "createdAt" | "updatedAt">): Promise<ContactMessage> => {
  const doc = await ContactMessageModel.create(data);
  return doc.toJSON() as unknown as ContactMessage;
};

export const findAll = async (): Promise<ContactMessage[]> => {
  const docs = await ContactMessageModel.find().sort({ createdAt: -1 });
  return docs.map((doc) => doc.toJSON() as unknown as ContactMessage);
};

export const findById = async (id: string): Promise<ContactMessage | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await ContactMessageModel.findById(id);
  return doc ? (doc.toJSON() as unknown as ContactMessage) : null;
};

export const updateById = async (
  id: string,
  updates: { status: ContactMessageStatus } & { updatedAt: Date }
): Promise<ContactMessage | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await ContactMessageModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as ContactMessage) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) return false;
  const result = await ContactMessageModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
};
