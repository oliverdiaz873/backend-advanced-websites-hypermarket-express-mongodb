import { Request, Response, NextFunction } from "express";
import * as inventoryService from "../services/inventory.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const inventory = inventoryService.getAll();
    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const record = inventoryService.getById(req.params.id as string);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getByProductId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const record = inventoryService.getByProductId(req.params.productId as string);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};
