import { Schema, model, Types } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IAddress {
  id: string;
  userId: Types.ObjectId;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  reference?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    zipCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

addressSchema.index({ userId: 1, isDefault: 1 });

export const AddressModel = model<IAddress>("Address", addressSchema);
