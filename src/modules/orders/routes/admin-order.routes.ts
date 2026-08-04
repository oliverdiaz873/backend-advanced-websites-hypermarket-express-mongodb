import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", orderController.getPageAdmin);
router.get("/:id", orderController.findByIdAdmin);
router.patch("/:id/status", validateRequiredFields(["status"]), orderController.updateStatusAdmin);

export default router;
