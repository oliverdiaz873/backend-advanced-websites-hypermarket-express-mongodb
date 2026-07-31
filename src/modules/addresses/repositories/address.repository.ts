import { AddressModel } from "../models/address.model";
import { isValidObjectId, toObjectId } from "../../../shared/utils/mongo";
import type { Address } from "../../../types";

export const findAll = async (): Promise<Address[]> => {
  const docs = await AddressModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as Address);
};

export const findById = async (id: string): Promise<Address | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await AddressModel.findById(id);
  return doc ? (doc.toJSON() as unknown as Address) : null;
};

export const findByUserId = async (userId: string): Promise<Address[]> => {
  if (!isValidObjectId(userId)) return [];
  const docs = await AddressModel.find({ userId: toObjectId(userId) });
  return docs.map((doc) => doc.toJSON() as unknown as Address);
};
