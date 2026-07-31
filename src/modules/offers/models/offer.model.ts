import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IOffer {
  id: string;
  productId: string;
  originalPrice: number;
  discountPrice: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    productId: { type: String, ref: "Product", required: true },
    originalPrice: { type: Number, required: true, min: 0 },
    discountPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (this: any, value: number): boolean {
          return value < this.originalPrice;
        },
        message: "discountPrice must be less than originalPrice",
      },
    },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    title: { type: String, trim: true },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

offerSchema.index({ productId: 1 });
offerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
offerSchema.index({ createdAt: 1 });

export const OfferModel = model<IOffer>("Offer", offerSchema);
