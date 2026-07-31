import { Schema, model, Types } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface ICartItem {
  productId: string;
  quantity: number;
}

export interface ICart {
  id: string;
  userId: Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: String, ref: "Product", required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const cartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

cartSchema.index({ userId: 1 }, { unique: true });

export const CartModel = model<ICart>("Cart", cartSchema);
