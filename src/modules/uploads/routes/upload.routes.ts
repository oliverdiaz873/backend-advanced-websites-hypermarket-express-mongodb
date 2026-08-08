import { Router } from "express";
import config from "../../../config";
import * as uploadController from "../controllers/upload.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";

const router = Router();

router.post(
  "/presigned",
  authMiddleware,
  authorizeRole("admin"),
  rateLimit({ windowMs: config.rateLimitWindowMs, max: 60 }),
  validateRequiredFields(["fileName", "contentType"]),
  uploadController.createPresigned
);

export default router;
