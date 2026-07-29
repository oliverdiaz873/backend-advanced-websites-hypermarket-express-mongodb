import { Request, Response, NextFunction } from "express";

export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter((field) => !req.body[field]);

    if (missing.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(", ")}`,
        statusCode: 400,
      });
      return;
    }

    next();
  };
};
