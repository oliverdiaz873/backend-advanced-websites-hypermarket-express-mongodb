import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IBrand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const BrandModel = model<IBrand>("Brand", brandSchema);
