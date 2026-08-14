import { Request, Response, NextFunction } from "express";
import * as adminSearchService from "../services/admin-search.service";

export const search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
    const data = await adminSearchService.search({ q, limit });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};