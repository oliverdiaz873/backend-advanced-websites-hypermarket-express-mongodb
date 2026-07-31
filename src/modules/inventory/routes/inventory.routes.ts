import { Router } from "express";
import * as inventoryController from "../controllers/inventory.controller";

const router = Router();

router.get("/", inventoryController.getAll);
router.get("/product/:productId", inventoryController.getByProductId);
router.get("/:id", inventoryController.getById);

export default router;
