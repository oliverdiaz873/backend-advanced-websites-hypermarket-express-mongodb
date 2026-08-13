import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { toJSONOptions } from "../../../shared/utils/mongo";
import type { CustomerAddress, CustomerStatus } from "../../../types";

const SALT_ROUNDS = 10;

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "customer" | "admin";
  phone?: string;
  avatar?: string;
  address?: CustomerAddress;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}

const customerAddressSchema = new Schema<CustomerAddress>(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    phone: { type: String, trim: true },
    avatar: { type: String, trim: true },
    address: { type: customerAddressSchema },
    status: { type: String, enum: ["active", "blocked", "pending"], default: "active" },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

export const UserModel = model<IUser>("User", userSchema);
