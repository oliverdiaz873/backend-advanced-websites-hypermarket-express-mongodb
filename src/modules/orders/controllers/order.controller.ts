import { Request, Response, NextFunction } from "express";
import * as orderService from "../services/order.service";

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.create(req.user!.id);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const orders = await orderService.findByUser(req.user!.id);
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

export const findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.findById(req.user!.id, req.params.id as string);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.updateStatus(req.user!.id, req.params.id as string, req.body.status);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
