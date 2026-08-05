import { Request, Response, NextFunction } from "express";
import * as auditService from "../services/audit.service";
import type { AuditAction, AuditLog, AuditLogQuery } from "../../../types";

const toEntityLog = (log: AuditLog) => ({
  id: log.id,
  userId: log.userId,
  userName: log.userName,
  action: log.action,
  entity: log.resource,
  entityId: log.resourceId,
  success: log.success,
  details: log.details,
  createdAt: log.createdAt,
});

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const getPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: AuditLogQuery = {
      page: Number(req.query.page),
      limit: Number(req.query.limit),
      q: asString(req.query.q),
      userId: asString(req.query.userId),
      action: asString(req.query.action) as AuditAction | undefined,
      entity: asString(req.query.entity),
      entityId: asString(req.query.entityId),
      from: asString(req.query.from),
      to: asString(req.query.to),
      sortOrder: req.query.sortOrder === "asc" || req.query.sortOrder === "desc" ? req.query.sortOrder : undefined,
    };
    const result = await auditService.getPage(query);
    res.json({
      success: true,
      data: result.items.map(toEntityLog),
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

export const findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const auditLog = await auditService.getById(req.params.id as string);
    res.json({ success: true, data: toEntityLog(auditLog) });
  } catch (error) {
    next(error);
  }
};