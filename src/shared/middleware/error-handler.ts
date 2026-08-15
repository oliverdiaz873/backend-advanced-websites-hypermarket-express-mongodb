import { Request, Response, NextFunction } from "express";
import config from "../../config";
import { logger } from "../logger/logger";
import { mapError, type ErrorCode, type MappedError } from "../errors/error-map";

interface AppError extends Error {
  statusCode?: number;
}

export interface ErrorResponseBody {
  success: false;
  message: string;
  statusCode: number;
  code: ErrorCode;
  requestId?: string;
  stack?: string;
}

export const toErrorResponse = (
  mapped: MappedError,
  requestId: string | undefined,
  stack: string | undefined,
  exposeStack: boolean,
  message: string = mapped.message
): ErrorResponseBody => {
  const body: ErrorResponseBody = {
    success: false,
    message,
    statusCode: mapped.statusCode,
    code: mapped.code,
  };

  if (requestId) body.requestId = requestId;
  if (exposeStack && stack) body.stack = stack;

  return body;
};

const errorHandler = (err: AppError, req: Request, res: Response, _next: NextFunction): void => {
  const mapped = mapError(err);

  logger.error(`Unhandled error: ${mapped.code}`, {
    code: mapped.code,
    statusCode: mapped.statusCode,
    method: req.method,
    path: req.originalUrl,
    requestId: req.requestId,
    stack: err.stack,
  });

  const isProduction = config.nodeEnv === "production";
  // En producción nunca exponemos el mensaje interno de errores desconocidos.
  const message =
    mapped.code === "INTERNAL_ERROR" && !isProduction ? err.message || mapped.message : mapped.message;

  const exposeStack = config.nodeEnv === "development";

  res.status(mapped.statusCode).json(toErrorResponse(mapped, req.requestId, err.stack, exposeStack, message));
};

export default errorHandler;
