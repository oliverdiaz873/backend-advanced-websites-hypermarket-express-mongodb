import { Request, Response, NextFunction } from "express";
import * as offerService from "../services/offer.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const offers = await offerService.getAll(req.query.lang);
    res.json({ success: true, data: offers });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const offer = await offerService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const offer = await offerService.updateById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: offer });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await offerService.remove(req.params.id as string, req.user?.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
