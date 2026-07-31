import { Router } from "express";
import * as contactController from "../controllers/contact.controller";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";
import { rateLimit } from "../../../shared/middleware/rate-limit.middleware";

const router = Router();

router.post(
  "/",
  rateLimit({ windowMs: 60_000, max: 10, message: "Too many messages, please try again later" }),
  validateRequiredFields(["name", "email", "message"]),
  contactController.create
);

export default router;
