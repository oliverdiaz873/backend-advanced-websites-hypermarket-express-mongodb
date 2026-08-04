import { Router } from "express";
import * as inventoryMovementController from "../controllers/inventory-movement.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", inventoryMovementController.getPage);

export default router;
