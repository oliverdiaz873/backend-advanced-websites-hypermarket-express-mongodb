import { Router } from "express";
import * as brandController from "../controllers/brand.controller";

const router = Router();

router.get("/", brandController.getAll);
router.get("/:id", brandController.getById);

export default router;
