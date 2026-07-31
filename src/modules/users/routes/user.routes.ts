import { Router } from "express";
import * as userController from "../controllers/user.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.get("/", authMiddleware, authorizeRole("admin"), userController.getAll);
router.get("/:id", authMiddleware, userController.getById);
router.post("/", authMiddleware, authorizeRole("admin"), validateRequiredFields(["name", "email", "password"]), userController.create);
router.patch("/:id", authMiddleware, authorizeRole("admin"), userController.updateById);
router.delete("/:id", authMiddleware, authorizeRole("admin"), userController.deleteById);

export default router;
