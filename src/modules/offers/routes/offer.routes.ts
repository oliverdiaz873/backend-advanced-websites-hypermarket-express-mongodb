import { Router } from "express";
import * as offerController from "../controllers/offer.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.get("/", offerController.getAll);
router.post("/", authMiddleware, authorizeRole("admin"), offerController.create);
router.patch("/:id", authMiddleware, authorizeRole("admin"), offerController.update);
router.delete("/:id", authMiddleware, authorizeRole("admin"), offerController.remove);

export default router;
