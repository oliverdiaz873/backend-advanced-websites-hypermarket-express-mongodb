import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, pagination } = await productService.getPage(req.query as Record<string, unknown>);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.getById(req.params.id as string);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.updateById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await productService.remove(req.params.id as string, req.user?.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
