import { Router } from "express";
import * as addressController from "../controllers/address.controller";

const router = Router();

router.get("/", addressController.getAll);
router.get("/user/:userId", addressController.getByUser);
router.get("/:id", addressController.getById);

export default router;
