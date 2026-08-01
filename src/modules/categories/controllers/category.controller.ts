import { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await categoryService.getAll();
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await categoryService.getById(req.params.id as string);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await categoryService.updateById(req.params.id as string, req.body);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await categoryService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
