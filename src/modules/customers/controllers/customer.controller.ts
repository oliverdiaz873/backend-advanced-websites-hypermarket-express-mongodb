import { Request, Response, NextFunction } from "express";
import * as customerService from "../services/customer.service";

export const getPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { items, pagination } = await customerService.getPage(req.query as Record<string, unknown>);
    res.json({ success: true, data: items, pagination });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customerService.getById(req.params.id as string);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customerService.updateById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const customer = await customerService.updateStatus(
      req.params.id as string,
      req.body.status as string,
      req.user?.id
    );
    res.json({ success: true, data: customer });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const stats = await customerService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
