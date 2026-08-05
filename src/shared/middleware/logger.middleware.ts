import { Request, Response, NextFunction } from "express";
import { logger } from "../logger/logger";

const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  const { method, url } = req;

  res.on("finish", () => {
    logger.info("http request", {
      method,
      url,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });

  next();
};

export default httpLogger;