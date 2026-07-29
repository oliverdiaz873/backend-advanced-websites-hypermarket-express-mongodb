import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";

export const getAll = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const users = userService.getAll();
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

export const getById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = userService.getById(req.params.id as string);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const create = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const user = userService.updateById(req.params.id as string, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const deleteById = (req: Request, res: Response, next: NextFunction): void => {
  try {
    userService.deleteById(req.params.id as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
