import { Request, Response, NextFunction } from "express";
import * as statsService from "../services/stats.service";

const toQuery = (req: Request) => statsService.parseStatsQuery(req.query as Record<string, unknown>);

export const getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const overview = await statsService.getOverview();
    res.json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getDashboard(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getRevenue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getRevenueSeries(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getOrdersByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getOrdersByStatus(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getTopProducts(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getCategorySales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getCategorySales(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getInventorySummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await statsService.getInventorySummary(toQuery(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};