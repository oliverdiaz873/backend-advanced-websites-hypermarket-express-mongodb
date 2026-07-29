import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.getMe);

export default router;
