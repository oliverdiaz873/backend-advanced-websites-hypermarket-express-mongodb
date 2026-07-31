import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const UserModel = model<IUser>("User", userSchema);
