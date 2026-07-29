import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", cartController.getCart);
router.post("/items", validateRequiredFields(["productId"]), cartController.addItem);
router.patch("/items/:productId", cartController.updateItem);
router.delete("/items/:productId", cartController.removeItem);
router.delete("/", cartController.clearCart);

export default router;
