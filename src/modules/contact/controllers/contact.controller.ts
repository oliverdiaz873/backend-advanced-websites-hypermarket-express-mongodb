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
