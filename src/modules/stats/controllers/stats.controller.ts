import { Request, Response, NextFunction } from "express";
import * as statsService from "../services/stats.service";

export const getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const overview = await statsService.getOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};
