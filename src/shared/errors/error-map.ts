export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

interface AppError extends Error {
  statusCode?: number;
}

export interface MappedError {
  statusCode: number;
  code: ErrorCode;
  message: string;
}

const errorByName = (name: string | undefined): ErrorCode | undefined => {
  switch (name) {
    case "NotFoundError":
      return "NOT_FOUND";
    case "UnauthorizedError":
      return "UNAUTHORIZED";
    case "ForbiddenError":
      return "FORBIDDEN";
    case "ConflictError":
    case "EmailAlreadyExistsError":
    case "InsufficientStockError":
      return "CONFLICT";
    case "InvalidDataError":
      return "VALIDATION_ERROR";
    default:
      return undefined;
  }
};

const messageFor = (code: ErrorCode): string => {
  switch (code) {
    case "VALIDATION_ERROR":
      return "Invalid request";
    case "NOT_FOUND":
      return "Resource not found";
    case "UNAUTHORIZED":
      return "Unauthorized";
    case "FORBIDDEN":
      return "Forbidden";
    case "CONFLICT":
      return "Conflict";
    case "RATE_LIMITED":
      return "Too many requests, please try again later";
    default:
      return "Internal server error";
  }
};

export const mapError = (err: AppError): MappedError => {
  const name = err.name;

  if (name === "ValidationError") {
    const errors = (err as { errors?: Record<string, { message: string }> }).errors ?? {};
    const messages = Object.values(errors).map((e) => e.message);
    return {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: messages.length > 0 ? messages.join(", ") : "Invalid request",
    };
  }

  if (name === "CastError") {
    return { statusCode: 400, code: "VALIDATION_ERROR", message: "Invalid identifier format" };
  }

  const mongoServerError = err as { name?: string; code?: number };
  if (mongoServerError.name === "MongoServerError" && mongoServerError.code === 11000) {
    return {
      statusCode: 409,
      code: "CONFLICT",
      message: "Duplicate value: resource already exists",
    };
  }

  const bodyParserError = err as { type?: string };
  if (bodyParserError.type === "entity.too.large") {
    return { statusCode: 413, code: "VALIDATION_ERROR", message: "File too large" };
  }

  const code = errorByName(err.name);
  if (code) {
    const statusCode = err.statusCode ?? statusCodeFor(code);
    return { statusCode, code, message: err.message || messageFor(code) };
  }

  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Internal server error" };
};

const statusCodeFor = (code: ErrorCode): number => {
  switch (code) {
    case "VALIDATION_ERROR":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "CONFLICT":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "INTERNAL_ERROR":
      return 500;
  }
};