import { Router } from "express";
import * as statsController from "../controllers/stats.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", statsController.getOverview);

export default router;
