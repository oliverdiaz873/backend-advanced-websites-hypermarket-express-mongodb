import { Request, Response, NextFunction } from "express";
import * as addressService from "../services/address.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const addresses = addressService.getAll();
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const address = addressService.getById(req.params.id as string);
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

export const getByUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const addresses = addressService.getByUser(req.params.userId as string);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};
