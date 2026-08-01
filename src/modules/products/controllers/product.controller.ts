import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const products = await productService.getAll();
    res.json({ success: true, data: products });
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
    const product = await productService.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.updateById(req.params.id as string, req.body);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await productService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
