import { Router } from "express";
import * as addressController from "../controllers/address.controller";
import authMiddleware from "../../../shared/middleware/auth.middleware";
import { validateRequiredFields } from "../../../shared/middleware/validation.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", addressController.getByUser);
router.get("/user/:userId", addressController.getByUser);
router.get("/:id", addressController.getById);
router.post("/", validateRequiredFields(["label", "street", "city", "state", "zipCode", "country"]), addressController.create);
router.patch("/:id", addressController.updateById);
router.delete("/:id", addressController.deleteById);

export default router;
