import { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { runWithRequestId } from "../logger/request-context";

const MAX_REQUEST_ID_LENGTH = 64;
const VALID_REQUEST_ID = /^[A-Za-z0-9\-_.]+$/;

const sanitizeRequestId = (value: unknown): string | undefined => {
  if (value === undefined) return undefined;
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return undefined;
  const trimmed = candidate.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_REQUEST_ID_LENGTH) return undefined;
  if (!VALID_REQUEST_ID.test(trimmed)) return undefined;
  return trimmed;
};

const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = sanitizeRequestId(req.headers["x-request-id"]) || randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  runWithRequestId(requestId, () => next());
};

export default requestIdMiddleware;