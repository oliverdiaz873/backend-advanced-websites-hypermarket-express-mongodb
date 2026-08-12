import { Request, Response, NextFunction } from "express";
import * as orderService from "../services/order.service";
import type { OrderQuery, OrderSortField, OrderStatus } from "../../../types";

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.create(
      req.user!.id,
      req.body.addressId,
      typeof req.body.idempotencyKey === "string" ? req.body.idempotencyKey : undefined
    );
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const pay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.pay(req.user!.id, req.params.id as string);
    res.json({ success: true, data: order });
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

export const getPageAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query: Partial<OrderQuery> = {
      page: Number(req.query.page),
      limit: Number(req.query.limit),
      q: typeof req.query.q === "string" ? req.query.q : undefined,
      status: typeof req.query.status === "string" ? (req.query.status as OrderStatus) : undefined,
      customerId: typeof req.query.customerId === "string" ? req.query.customerId : undefined,
      sortBy: typeof req.query.sortBy === "string" ? (req.query.sortBy as OrderSortField) : undefined,
      sortOrder: req.query.sortOrder === "asc" || req.query.sortOrder === "desc" ? req.query.sortOrder : undefined,
    };
    const result = await orderService.getPageAdmin(query);
    res.json({ success: true, data: result.items, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

export const findByIdAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.getByIdAdmin(req.params.id as string);
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const updateStatusAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const order = await orderService.updateStatusAdmin(
      req.params.id as string,
      req.body.status,
      req.user?.id,
      typeof req.body.note === "string" ? req.body.note : undefined
    );
    res.json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};
