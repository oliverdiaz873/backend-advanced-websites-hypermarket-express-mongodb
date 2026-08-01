import { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, message = "Too many requests, please try again later" } = options;
  const store = new Map<string, Bucket>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) {
        store.delete(key);
      }
    }
  }, 60000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = store.get(key);

    if (!bucket || bucket.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({ success: false, message, statusCode: 429 });
      return;
    }

    bucket.count++;
    next();
  };
};
