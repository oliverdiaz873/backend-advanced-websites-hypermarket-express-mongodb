import { Request, Response, NextFunction } from "express";
import * as brandService from "../services/brand.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await brandService.getAll();
    res.json({ success: true, data: brands });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.getById(req.params.id as string);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};
