import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IProductCategory {
  name: string;
  slug: string;
}

export interface IProductBrand {
  name: string;
  slug: string;
}

export interface IProduct {
  _id: string;
  sku: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  categoryId: string;
  category: IProductCategory;
  brandId?: string;
  brand?: IProductBrand;
  unit?: string;
  unitQuantity?: number;
  status: "active" | "inactive";
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const categoryEmbed = new Schema<IProductCategory>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
  },
  { _id: false }
);

const brandEmbed = new Schema<IProductBrand>(
  {
    name: { type: String },
    slug: { type: String },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    _id: { type: String, required: true },
    sku: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    categoryId: { type: String, required: true },
    category: { type: categoryEmbed, required: true },
    brandId: { type: String },
    brand: { type: brandEmbed },
    unit: { type: String },
    unitQuantity: { type: Number },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

productSchema.index({ categoryId: 1 });
productSchema.index({ brandId: 1 });
productSchema.index({ "category.slug": 1 });
productSchema.index({ name: "text" });

export const ProductModel = model<IProduct>("Product", productSchema);
