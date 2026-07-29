import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.get("/", userController.getAll);
router.get("/:id", userController.getById);
router.post("/", validateRequiredFields(["name", "email", "password"]), userController.create);
router.patch("/:id", userController.updateById);
router.delete("/:id", userController.deleteById);

export default router;
