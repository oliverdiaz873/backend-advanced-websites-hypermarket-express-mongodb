import { Schema, model, Types } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import { ORDER_STATUS } from "../../../shared/constants/order-status";

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export interface IShippingAddress {
  label?: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  reference?: string;
}

export interface IOrderStatusHistoryEntry {
  status: "pending" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";
  changedAt: Date;
  by?: string;
  note?: string;
}

export interface IOrder {
  id: string;
  userId: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress?: IShippingAddress;
  totalItems: number;
  subtotal: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "completed" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  statusHistory?: IOrderStatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, ref: "Product", required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    label: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
    reference: { type: String },
  },
  { _id: false }
);

const orderStatusHistoryEntrySchema = new Schema<IOrderStatusHistoryEntry>(
  {
    status: {
      type: String,
      required: true,
      enum: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CANCELLED,
      ],
    },
    changedAt: { type: Date, required: true },
    by: { type: String, trim: true },
    note: { type: String, trim: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: shippingAddressSchema },
    totalItems: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: [
        ORDER_STATUS.PENDING,
        ORDER_STATUS.CONFIRMED,
        ORDER_STATUS.PROCESSING,
        ORDER_STATUS.SHIPPED,
        ORDER_STATUS.COMPLETED,
        ORDER_STATUS.CANCELLED,
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    statusHistory: { type: [orderStatusHistoryEntrySchema], default: [] },
  },
  { timestamps: true, toJSON: toJSONOptions }
);

orderSchema.index({ userId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "items.productId": 1 });

export const OrderModel = model<IOrder>("Order", orderSchema);
