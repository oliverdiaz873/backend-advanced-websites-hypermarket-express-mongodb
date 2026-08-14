import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import { softDeletePlugin, type SoftDeleteModel } from "../../../shared/plugins/soft-delete.plugin";

export interface IBrand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: "active" | "inactive";
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    logo: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

brandSchema.plugin(softDeletePlugin);

brandSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } }, name: "name_partial_unique" }
);
brandSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } }, name: "slug_partial_unique" }
);

export const BrandModel = model<IBrand, SoftDeleteModel<IBrand>>("Brand", brandSchema);
