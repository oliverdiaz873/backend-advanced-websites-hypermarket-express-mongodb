import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface ISubcategory {
  name: string;
  slug: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  subcategories: ISubcategory[];
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
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    subcategories: { type: [subcategorySchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

export const CategoryModel = model<ICategory>("Category", categorySchema);
