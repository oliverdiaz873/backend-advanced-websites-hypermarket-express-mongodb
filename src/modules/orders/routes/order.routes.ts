import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", validateRequiredFields(["addressId", "idempotencyKey"]), orderController.create);
router.get("/", orderController.findAll);
router.post("/:id/pay", orderController.pay);
router.get("/:id", orderController.findById);
router.patch("/:id/status", validateRequiredFields(["status"]), orderController.updateStatus);

export default router;
