import { Request, Response, NextFunction } from "express";
import * as offerService from "../services/offer.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const offers = await offerService.getAll();
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};
