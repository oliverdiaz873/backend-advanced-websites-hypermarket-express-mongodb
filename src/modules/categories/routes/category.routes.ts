import { Router } from "express";
import * as categoryController from "../controllers/category.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.get("/", categoryController.getAll);
router.get("/:id", categoryController.getById);
router.post("/", authMiddleware, authorizeRole("admin"), categoryController.create);
router.patch("/:id", authMiddleware, authorizeRole("admin"), categoryController.update);
router.delete("/:id", authMiddleware, authorizeRole("admin"), categoryController.remove);
router.post("/:id/restore", authMiddleware, authorizeRole("admin"), categoryController.restore);

export default router;
