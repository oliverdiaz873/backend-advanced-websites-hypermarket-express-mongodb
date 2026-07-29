import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const products = productService.getAll();
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const product = productService.getById(req.params.id as string);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};
