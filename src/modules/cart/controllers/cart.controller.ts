import { Request, Response, NextFunction } from "express";
import * as cartService from "../services/cart.service";

export const getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.getCart(req.user!.id);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.addItem(req.user!.id, req.body.productId, req.body.quantity || 1);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.updateItem(req.user!.id, req.params.productId as string, req.body.quantity);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.removeItem(req.user!.id, req.params.productId as string);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};

export const clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cart = await cartService.clearCart(req.user!.id);
    res.json({ success: true, data: cart });
  } catch (error) {
    next(error);
  }
};
