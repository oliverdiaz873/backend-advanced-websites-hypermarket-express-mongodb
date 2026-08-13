import { Router } from "express";
import * as offerController from "../controllers/offer.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", offerController.listAllAdmin);

export default router;