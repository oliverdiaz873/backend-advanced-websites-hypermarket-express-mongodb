import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import {
  INVENTORY_MOVEMENT_TYPES,
  type InventoryMovementType,
} from "../../inventory/constants/inventory-movement-types";
import {
  INVENTORY_ADJUSTMENT_REASONS,
  type AdjustmentReason,
} from "../../inventory/constants/inventory-adjustment-reasons";

export interface IInventoryMovement {
  id: string;
  inventoryId: string;
  productId: string;
  type: InventoryMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: AdjustmentReason;
  createdBy?: string;
  createdAt: Date;
}

const inventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    inventoryId: { type: String, ref: "Inventory", required: true },
    productId: { type: String, ref: "Product", required: true },
    type: { type: String, required: true, enum: INVENTORY_MOVEMENT_TYPES },
    quantity: { type: Number, required: true, min: 0 },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, enum: INVENTORY_ADJUSTMENT_REASONS },
    createdBy: { type: String, trim: true },
  },
  { timestamps: true, toJSON: toJSONOptions, collection: "inventory_movements" }
);

inventoryMovementSchema.index({ inventoryId: 1, createdAt: -1 });
inventoryMovementSchema.index({ productId: 1, createdAt: -1 });
inventoryMovementSchema.index({ type: 1 });

export const InventoryMovementModel = model<IInventoryMovement>(
  "InventoryMovement",
  inventoryMovementSchema
);
