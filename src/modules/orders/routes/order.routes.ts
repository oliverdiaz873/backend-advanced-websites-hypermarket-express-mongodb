import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequiredFields(["addressId"]), orderController.create);
router.get("/", orderController.findAll);
router.get("/:id", orderController.findById);
router.patch("/:id/status", validateRequiredFields(["status"]), orderController.updateStatus);

export default router;
