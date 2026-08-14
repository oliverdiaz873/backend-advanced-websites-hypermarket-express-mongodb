import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import { softDeletePlugin, type SoftDeleteModel } from "../../../shared/plugins/soft-delete.plugin";

export interface ISubcategory {
  name: string;
  slug: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  subcategories: ISubcategory[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const subcategorySchema = new Schema<ISubcategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const categorySchema = new Schema<ICategory>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    subcategories: { type: [subcategorySchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

categorySchema.plugin(softDeletePlugin);

categorySchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } }, name: "name_partial_unique" }
);
categorySchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } }, name: "slug_partial_unique" }
);

export const CategoryModel = model<ICategory, SoftDeleteModel<ICategory>>("Category", categorySchema);
