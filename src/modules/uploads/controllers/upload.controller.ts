import { Request, Response, NextFunction } from "express";
import * as uploadService from "../services/upload.service";

export const createPresigned = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await uploadService.createPresignedUpload(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
