import { Request, Response, NextFunction } from "express";
import * as searchService from "../services/search.service";

export const search = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const q = (req.query.q as string) || "";
    const category = req.query.category as string | undefined;
    const results = searchService.search(q, category);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
