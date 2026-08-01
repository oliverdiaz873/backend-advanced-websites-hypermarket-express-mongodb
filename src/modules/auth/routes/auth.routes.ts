import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.post("/register", validateRequiredFields(["email", "password"]), authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getMe);

export default router;
