import { Request, Response, NextFunction } from "express";
import * as offerService from "../services/offer.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const offers = offerService.getAll();
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};
