import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import type { AuditAction } from "../../../types";

export interface IAuditLog {
  id: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String, trim: true },
    success: { type: Boolean, required: true },
  },
  { timestamps: true, toJSON: toJSONOptions, collection: "auditlogs" }
);

auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<IAuditLog>("AuditLog", auditLogSchema);
