import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: "pending" | "read" | "answered";
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ["pending", "read", "answered"], default: "pending" },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

contactMessageSchema.index({ status: 1 });
contactMessageSchema.index({ createdAt: -1 });

export const ContactMessageModel = model<IContactMessage>("ContactMessage", contactMessageSchema);
