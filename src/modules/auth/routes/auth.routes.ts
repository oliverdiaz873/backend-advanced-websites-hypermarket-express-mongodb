import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  message: "Too many login attempts, please try again later",
});

const registerRateLimit = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: "Too many registration attempts, please try again later",
});

router.post("/register", registerRateLimit, validateRequiredFields(["email", "password"]), authController.register);
router.post("/login", loginRateLimit, authController.login);
router.get("/me", authMiddleware, authController.getMe);

export default router;
