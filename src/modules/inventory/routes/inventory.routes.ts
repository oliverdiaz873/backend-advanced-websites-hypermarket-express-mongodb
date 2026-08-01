import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", inventoryController.getAll);
router.get("/product/:productId", inventoryController.getByProductId);
router.get("/low-stock", inventoryController.getLowStock);
router.get("/:id", inventoryController.getById);
router.patch("/:id", inventoryController.adjustStock);

export default router;
