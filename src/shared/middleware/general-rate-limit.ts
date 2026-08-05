import { Request, Response, NextFunction } from "express";
import config from "../../config";
import { rateLimit } from "./rate-limit.middleware";

export const generalRateLimit = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: "Too many requests, please try again later",
});

export const isGeneralRateLimitEnabled = (nodeEnv: string | undefined): boolean =>
  nodeEnv !== "test";

export const applyGeneralRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  if (!isGeneralRateLimitEnabled(config.nodeEnv)) {
    next();
    return;
  }
  generalRateLimit(req, res, next);
};