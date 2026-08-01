import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await userService.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetId = req.params.id as string;
    if (req.user && req.user.role !== "admin" && req.user.id !== targetId) {
      res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own data",
        statusCode: 403,
      });
      return;
    }
    const user = await userService.getById(targetId);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await userService.create(req.body, req.user?.id);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await userService.updateById(req.params.id as string, req.body, req.user?.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await userService.deleteById(req.params.id as string, req.user?.id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
