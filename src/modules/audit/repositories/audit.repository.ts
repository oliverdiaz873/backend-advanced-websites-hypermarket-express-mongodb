import { AuditLogModel } from "../models/audit-log.model";
import { isValidObjectId } from "../../../shared/utils/mongo";
import type { AuditAction, AuditLog } from "../../../types";

export interface AuditFindPageInput {
  page: number;
  limit: number;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  q?: string;
  from?: Date;
  to?: Date;
  sortOrder?: "asc" | "desc";
}

export interface AuditPageResult {
  items: AuditLog[];
  total: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const create = async (data: Omit<AuditLog, "id" | "createdAt">): Promise<AuditLog> => {
  const doc = await AuditLogModel.create(data);
  return doc.toJSON() as unknown as AuditLog;
};

export const findPage = async (query: AuditFindPageInput): Promise<AuditPageResult> => {
  const { page, limit, userId, action, resource, resourceId, q, from, to, sortOrder } = query;

  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;
  if (action) filter.action = action;
  if (resource) filter.resource = resource;
  if (resourceId) filter.resourceId = resourceId;

  const dateRange: Record<string, Date> = {};
  if (from) dateRange.$gte = from;
  if (to) dateRange.$lte = to;
  if (from || to) filter.createdAt = dateRange;

  let orClause: Record<string, unknown>[] | undefined;
  if (q && q.trim()) {
    const escaped = escapeRegex(q.trim());
    orClause = [
      { resourceId: { $regex: escaped, $options: "i" } },
      { userName: { $regex: escaped, $options: "i" } },
      { action: { $regex: escaped, $options: "i" } },
    ];
    filter.$or = orClause;
  }

  const skip = (page - 1) * limit;
  const sortDirection: 1 | -1 = sortOrder === "asc" ? 1 : -1;
  const sort = { createdAt: sortDirection };

  const [docs, total] = await Promise.all([
    AuditLogModel.find(filter).sort(sort).skip(skip).limit(limit),
    AuditLogModel.countDocuments(filter),
  ]);

  const items = docs.map((doc) => doc.toJSON() as unknown as AuditLog);
  const pages = Math.max(1, Math.ceil(total / limit));
  return { items, total, pagination: { page, limit, total, pages } };
};

export const find = async (id: string): Promise<AuditLog | null> => {
  if (!isValidObjectId(id)) return null;
  const doc = await AuditLogModel.findById(id);
  return doc ? (doc.toJSON() as unknown as AuditLog) : null;
};