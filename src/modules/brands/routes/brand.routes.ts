import { Router } from "express";
import * as brandController from "../controllers/brand.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.get("/", brandController.getAll);
router.get("/:id", brandController.getById);
router.post("/", authMiddleware, authorizeRole("admin"), brandController.create);
router.patch("/:id", authMiddleware, authorizeRole("admin"), brandController.update);
router.delete("/:id", authMiddleware, authorizeRole("admin"), brandController.remove);

export default router;
