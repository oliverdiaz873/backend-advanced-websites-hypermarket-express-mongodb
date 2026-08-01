import mongoose from "mongoose";
import * as auditRepository from "../repositories/audit.repository";
import type { AuditAction, AuditLog } from "../../../types";

export interface AuditEntry {
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
}

const isConnected = (): boolean => mongoose.connection.readyState === 1;

export const log = async (entry: AuditEntry): Promise<void> => {
  try {
    if (!isConnected()) {
      if (process.env.NODE_ENV !== "test") {
        console.warn("[audit] Log omitido: MongoDB no conectado");
      }
      return;
    }
    const data: Omit<AuditLog, "id" | "createdAt"> = {
      userId: entry.userId,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      success: entry.success,
    };
    await auditRepository.create(data);
  } catch (error) {
    console.error("[audit] Error al registrar log:", error);
  }
};

export const runAudited = async <T>(
  entry: Omit<AuditEntry, "success">,
  fn: () => Promise<T>,
  getResourceId?: (result: T) => string | undefined
): Promise<T> => {
  try {
    const result = await fn();
    await log({ ...entry, success: true, resourceId: getResourceId ? getResourceId(result) : entry.resourceId });
    return result;
  } catch (error) {
    await log({ ...entry, success: false });
    throw error;
  }
};
