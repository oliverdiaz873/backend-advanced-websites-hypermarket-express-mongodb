import mongoose from "mongoose";
import * as auditRepository from "../repositories/audit.repository";
import * as userRepository from "../../users/repositories/user.repository";
import { isValidObjectId } from "../../../shared/utils/mongo";
import { NotFoundError } from "../../../shared/errors/not-found.error";
import type { AuditAction, AuditLog, AuditLogPageResult, AuditLogQuery } from "../../../types";

export interface AuditEntry {
  userId?: string;
  userName?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  success: boolean;
  details?: unknown;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const MAX_DETAILS_SIZE = 10_000;

const isConnected = (): boolean => mongoose.connection.readyState === 1;

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const parseDateBoundary = (value: string | undefined, endOfDay: boolean): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return endOfDay
      ? new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
      : new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  return date;
};

const resolveUserName = async (entry: AuditEntry): Promise<string | undefined> => {
  if (entry.userName) return entry.userName;
  if (!entry.userId || !isValidObjectId(entry.userId)) return undefined;
  try {
    const user = await userRepository.findById(entry.userId);
    return user?.name;
  } catch {
    return undefined;
  }
};

/** Limita el tamaño de `details` para evitar que AuditLog guarde payloads enormes. */
export const sanitizeDetails = (details: unknown): unknown => {
  if (details === undefined || details === null) return details;
  let json: string;
  try {
    json = typeof details === "string" ? details : JSON.stringify(details);
  } catch {
    return { truncated: true, message: "Details could not be serialized" };
  }
  const size = Buffer.byteLength(json, "utf8");
  if (size <= MAX_DETAILS_SIZE) return details;
  return { truncated: true, message: "Details truncated", originalSize: size };
};

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
      userName: await resolveUserName(entry),
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      success: entry.success,
      details: sanitizeDetails(entry.details),
    };
    await auditRepository.create(data);
  } catch (error) {
    console.error("[audit] Error al registrar log:", error);
  }
};

export const runAudited = async <T>(
  entry: Omit<AuditEntry, "success">,
  fn: () => Promise<T>,
  getResourceId?: (result: T) => string | undefined,
  getDetails?: (result: T) => unknown
): Promise<T> => {
  try {
    const result = await fn();
    await log({
      ...entry,
      success: true,
      resourceId: getResourceId ? getResourceId(result) : entry.resourceId,
      details: getDetails ? getDetails(result) : entry.details,
    });
    return result;
  } catch (error) {
    await log({ ...entry, success: false });
    throw error;
  }
};

export const getPage = async (query: AuditLogQuery): Promise<AuditLogPageResult> => {
  const page = Math.max(DEFAULT_PAGE, toInt(query.page, DEFAULT_PAGE));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(query.limit, DEFAULT_LIMIT)));
  const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

  const result = await auditRepository.findPage({
    page,
    limit,
    userId: query.userId || undefined,
    action: query.action || undefined,
    resource: query.entity || undefined,
    resourceId: query.entityId || undefined,
    q: query.q || undefined,
    from: parseDateBoundary(query.from, false),
    to: parseDateBoundary(query.to, true),
    sortOrder,
  });

  return { items: result.items, total: result.total, pagination: result.pagination };
};

export const getById = async (id: string): Promise<AuditLog> => {
  const auditLog = await auditRepository.find(id);
  if (!auditLog) {
    throw new NotFoundError("Audit log not found");
  }
  return auditLog;
};