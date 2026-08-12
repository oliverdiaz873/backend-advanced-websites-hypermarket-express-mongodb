import { Schema, model, Types } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import { ORDER_STATUS } from "../../../shared/constants/order-status";

export interface IOrderItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  unit?: string;
  unitQuantity?: number;
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
  idempotencyKey?: string;
  orderNumber?: string;
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
    originalPrice: { type: Number, min: 0 },
    discountPercentage: { type: Number, min: 0, max: 100 },
    image: { type: String, required: true },
    unit: { type: String, trim: true },
    unitQuantity: { type: Number, min: 0 },
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
    idempotencyKey: { type: String, trim: true },
    orderNumber: { type: String, trim: true },
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
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);
orderSchema.index({ orderNumber: 1 }, { unique: true, partialFilterExpression: { orderNumber: { $type: "string" } } });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "items.productId": 1 });

export const OrderModel = model<IOrder>("Order", orderSchema);
