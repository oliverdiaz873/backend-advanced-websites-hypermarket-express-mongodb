import { Router } from "express";
import * as contactController from "../controllers/contact.controller";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.post("/", validateRequiredFields(["name", "email", "message"]), contactController.create);

export default router;
