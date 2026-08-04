import { Request, Response, NextFunction } from "express";
import * as inventoryService from "../services/inventory.service";
import * as inventoryMovementService from "../../inventory-movements/services/inventory-movement.service";
import type { InventoryAdjustInput } from "../../../types";

export const getPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, pagination } = await inventoryService.getPage(req.query as Record<string, unknown>);
    res.json({ success: true, data: items, pagination });
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

export const getOutOfStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const records = await inventoryService.getOutOfStock();
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

export const adjust = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = req.body as InventoryAdjustInput;
    const record = await inventoryService.adjustInventory(req.params.id as string, body, req.user?.id);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const changeMinStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const record = await inventoryService.changeMinStock(
      req.params.id as string,
      {
        minStock: req.body.minStock as number,
        reason: req.body.reason as Parameters<typeof inventoryService.changeMinStock>[1]["reason"],
      },
      req.user?.id
    );
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(100, Number.parseInt(req.query.limit as string, 10) || 50);
    const result = await inventoryMovementService.getByInventoryId(req.params.id as string, page, limit);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};
