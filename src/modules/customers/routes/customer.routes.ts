import { Router } from "express";
import * as customerController from "../controllers/customer.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", customerController.getPage);
router.get("/stats", customerController.getStats);
router.get("/:id", customerController.getById);
router.patch("/:id/status", validateRequiredFields(["status"]), customerController.updateStatus);
router.patch("/:id", customerController.updateById);

export default router;
