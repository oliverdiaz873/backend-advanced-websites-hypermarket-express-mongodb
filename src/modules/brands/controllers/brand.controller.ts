import { Request, Response, NextFunction } from "express";
import * as brandService from "../services/brand.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const brands = brandService.getAll();
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const brand = brandService.getById(req.params.id as string);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};
