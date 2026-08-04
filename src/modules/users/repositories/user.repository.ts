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
  const user = await UserModel.findById(id);
  if (!user) return null;
  Object.assign(user, data);
  await user.save();
  return user.toJSON() as unknown as User;
};

export const findByIds = async (ids: string[]): Promise<User[]> => {
  const validIds = ids.filter(isValidObjectId);
  if (validIds.length === 0) return [];
  const docs = await UserModel.find({ _id: { $in: validIds } });
  const byId = new Map(docs.map((doc) => [String(doc._id), doc.toJSON() as unknown as User]));
  return ids.map((id) => byId.get(id)).filter((u): u is User => Boolean(u));
};

export const findIdsByNameOrEmail = async (term: string): Promise<string[]> => {
  const trimmed = term.trim();
  if (!trimmed) return [];
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const docs = await UserModel.find({
    $or: [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ],
  }).select("_id");
  return docs.map((doc) => String(doc._id));
};

export const deleteById = async (id: string): Promise<boolean> => {
  if (!isValidObjectId(id)) return false;
  const result = await UserModel.findByIdAndDelete(id);
  return result !== null;
};
