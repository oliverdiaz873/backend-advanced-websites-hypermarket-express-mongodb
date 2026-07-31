import { Types } from "mongoose";

export const isValidObjectId = (id: string): boolean => Types.ObjectId.isValid(id);

export const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

const normalize = (value: unknown): unknown => {
  if (value instanceof Types.ObjectId) return value.toString();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalize(val);
    }
    return result;
  }
  return value;
};

export const toJSONOptions = {
  versionKey: false,
  virtuals: true,
  transform: (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
    const normalized = normalize(ret) as Record<string, unknown>;
    normalized.id = String(normalized._id);
    delete normalized._id;
    delete normalized.__v;
    return normalized;
  },
};
