import { Router } from "express";
import * as adminSearchController from "../controllers/admin-search.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", adminSearchController.search);

export default router;