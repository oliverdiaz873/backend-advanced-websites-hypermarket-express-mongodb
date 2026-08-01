import { Router } from "express";
import * as contactController from "../controllers/contact.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", contactController.findAllAdmin);
router.get("/:id", contactController.findByIdAdmin);
router.patch("/:id", validateRequiredFields(["status"]), contactController.updateStatusAdmin);
router.delete("/:id", contactController.remove);

export default router;
