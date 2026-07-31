import { Request, Response, NextFunction } from "express";
import * as addressService from "../services/address.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const addresses = await addressService.getAll();
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const address = await addressService.getById(req.params.id as string);
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

export const getByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const addresses = await addressService.getByUser(req.params.userId as string);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};
