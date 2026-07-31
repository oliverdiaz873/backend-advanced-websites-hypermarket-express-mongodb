import { UserModel } from "../models/user.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import type { IUser } from "../models/user.model";
import type { User } from "../../../types";

export const findAll = async (): Promise<User[]> => {
  const docs = await UserModel.find();
  return docs.map((doc) => doc.toJSON() as unknown as User);
};

export const findById = async (id: string): Promise<User | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await UserModel.findById(id);
  return doc ? (doc.toJSON() as unknown as User) : null;
};

export const findByEmail = async (email: string): Promise<User | null> => {
  const doc = await UserModel.findOne({ email: email.toLowerCase().trim() });
  return doc ? (doc.toJSON() as unknown as User) : null;
};

export const create = async (user: Omit<User, "id">): Promise<User> => {
  const doc = await UserModel.create(user as unknown as IUser);
  return doc.toJSON() as unknown as User;
};

export const updateById = async (id: string, data: Partial<User>): Promise<User | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await UserModel.findByIdAndUpdate(id, data, { returnDocument: "after" });
  return doc ? (doc.toJSON() as unknown as User) : null;
};

export const deleteById = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) return false;
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
};
