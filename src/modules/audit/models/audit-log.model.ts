import { Schema, model } from "mongoose";
import { toJSONOptions } from "../../../shared/utils/mongo";
import type { AuditAction } from "../../../types";

export interface IAuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
  details?: unknown;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, trim: true },
    userName: { type: String, trim: true },
    action: { type: String, required: true, trim: true },
    resource: { type: String, required: true, trim: true },
    resourceId: { type: String, trim: true },
    success: { type: Boolean, required: true },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true, toJSON: toJSONOptions, collection: "auditlogs" }
);

auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<IAuditLog>("AuditLog", auditLogSchema);
