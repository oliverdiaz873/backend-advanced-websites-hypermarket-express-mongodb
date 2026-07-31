import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";

export interface IInventory {
  id: string;
  productId: string;
  stock: number;
  reservedStock: number;
  minStock?: number;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    productId: { type: String, ref: "Product", required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    minStock: { type: Number, min: 0 },
  },
  { timestamps: true, toJSON: toJSONOptions, collection: "inventory" }
);

inventorySchema.index({ productId: 1 }, { unique: true });
inventorySchema.index({ stock: 1 });

inventorySchema.virtual("availableStock").get(function () {
  return this.stock - this.reservedStock;
});

export const InventoryModel = model<IInventory>("Inventory", inventorySchema);
