import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";

export const getPageAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { data, pagination } = await productService.getAdminPage(req.query as Record<string, unknown>);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
};

export const findByIdAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.getAdminById(req.params.id as string);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const updateAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const product = await productService.updateAdminById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};