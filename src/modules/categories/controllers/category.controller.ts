import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const categories = categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const category = categoryService.getById(req.params.id as string);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};
