import { Request, Response, NextFunction } from "express";
import * as addressService from "../services/address.service";

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const address = await addressService.getById(req.params.id as string, req.user!.id, req.user!.role);
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

export const getByUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = (req.params.userId as string | undefined) || req.user!.id;
    const addresses = await addressService.getByUser(userId, req.user!.id, req.user!.role);
    res.json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const address = await addressService.create(req.user!.id, req.body);
    res.status(201).json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

export const updateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const address = await addressService.updateById(req.user!.id, req.params.id as string, req.body);
    res.json({ success: true, data: address });
  } catch (error) {
    next(error);
  }
};

export const deleteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await addressService.deleteById(req.user!.id, req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
