import { Request, Response, NextFunction } from "express";
import * as inventoryService from "../services/inventory.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const inventory = await inventoryService.getAll();
    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await inventoryService.getById(req.params.id as string);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getByProductId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await inventoryService.getByProductId(req.params.productId as string);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getLowStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const records = await inventoryService.getLowStock();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await inventoryService.adjustStock(req.params.id as string, {
      stock: req.body.stock as number | undefined,
      minStock: req.body.minStock as number | undefined,
    });
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};
