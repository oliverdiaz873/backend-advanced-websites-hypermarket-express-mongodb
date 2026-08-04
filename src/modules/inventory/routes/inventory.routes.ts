import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", inventoryController.getPage);
router.get("/low-stock", inventoryController.getLowStock);
router.get("/out-of-stock", inventoryController.getOutOfStock);
router.get("/product/:productId", inventoryController.getByProductId);
router.get("/:id/movements", inventoryController.getMovements);
router.get("/:id", inventoryController.getById);
router.post("/:id/adjust", inventoryController.adjust);
router.patch("/:id/min-stock", inventoryController.changeMinStock);

export default router;
