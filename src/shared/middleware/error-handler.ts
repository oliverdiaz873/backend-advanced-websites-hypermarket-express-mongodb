import { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";

interface AppError extends Error {
  statusCode?: number;
  code?: number;
}

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err instanceof MongooseError.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err instanceof MongooseError.CastError) {
    statusCode = 400;
    message = "Invalid identifier format";
  } else if (err.name === "MongoServerError" && err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value: resource already exists";
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
};

export default errorHandler;
