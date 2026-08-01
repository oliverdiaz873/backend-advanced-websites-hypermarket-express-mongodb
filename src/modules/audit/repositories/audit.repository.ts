import { AuditLogModel } from "../models/audit-log.model";
import type { AuditLog } from "../../../types";

export const create = async (data: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> => {
  const doc = await AuditLogModel.create(data);
  return doc.toJSON() as unknown as AuditLog;
};
