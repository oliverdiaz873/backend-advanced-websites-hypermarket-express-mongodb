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

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.updateById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: brand });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await brandService.remove(req.params.id as string, req.user?.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
