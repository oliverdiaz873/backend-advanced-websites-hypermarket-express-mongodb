import { Router } from "express";
import * as adminProductController from "../controllers/admin-product.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", adminProductController.getPageAdmin);
router.get("/:id", adminProductController.findByIdAdmin);
router.patch("/:id", adminProductController.updateAdmin);

export default router;