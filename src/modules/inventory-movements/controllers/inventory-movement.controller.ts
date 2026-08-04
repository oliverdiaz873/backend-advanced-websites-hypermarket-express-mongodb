import { Request, Response, NextFunction } from "express";
import * as inventoryMovementService from "../services/inventory-movement.service";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const toInt = (value: unknown, fallback: number): number => {
  const n = Number.parseInt(value as string, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const getPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(DEFAULT_PAGE, toInt(req.query.page, DEFAULT_PAGE));
    const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(req.query.limit, DEFAULT_LIMIT)));
    const type = ["increase", "decrease", "set", "min_stock_change"].includes(String(req.query.type))
      ? (req.query.type as "increase" | "decrease" | "set" | "min_stock_change")
      : undefined;

    const result = await inventoryMovementService.getPage({
      page,
      limit,
      productId: typeof req.query.productId === "string" ? req.query.productId : undefined,
      type,
    });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};
