import { Request, Response, NextFunction } from "express";
import * as contactService from "../services/contact.service";

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const message = await contactService.create(req.body);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const findAllAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const messages = await contactService.findAllAdmin();
    res.json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const findByIdAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const message = await contactService.findByIdAdmin(req.params.id as string);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const updateStatusAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const message = await contactService.updateStatusAdmin(req.params.id as string, req.body.status);
    res.json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contactService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
