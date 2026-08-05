import { Router } from "express";
import * as auditController from "../controllers/audit.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", auditController.getPage);
router.get("/:id", auditController.findById);

export default router;