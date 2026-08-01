import { Router } from "express";
import * as productController from "../controllers/product.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.get("/", productController.getAll);
router.get("/:id", productController.getById);
router.post("/", authMiddleware, authorizeRole("admin"), productController.create);
router.patch("/:id", authMiddleware, authorizeRole("admin"), productController.update);
router.delete("/:id", authMiddleware, authorizeRole("admin"), productController.remove);

export default router;
