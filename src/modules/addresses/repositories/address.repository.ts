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

export const create = async (data: Omit<Address, "id">): Promise<Address> => {
  const doc = await AddressModel.create(data);
  return doc.toJSON() as unknown as Address;
};

export const updateById = async (id: string, updates: Record<string, unknown>): Promise<Address | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await AddressModel.findByIdAndUpdate(id, updates, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as Address) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) return false;
  const doc = await AddressModel.findByIdAndDelete(id);
  return !!doc;
};

export const setDefaultOnly = async (userId: string, addressId: string): Promise<void> => {
  await AddressModel.updateMany({ userId: toObjectId(userId), isDefault: true }, { isDefault: false });
  await AddressModel.findByIdAndUpdate(addressId, { isDefault: true });
};
