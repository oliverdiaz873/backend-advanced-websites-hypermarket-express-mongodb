import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { setAuthCookie, clearAuthCookie } from "../auth-cookie";

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    setAuthCookie(res, result.token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    clearAuthCookie(res);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await authService.updateMe(req.user!.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
