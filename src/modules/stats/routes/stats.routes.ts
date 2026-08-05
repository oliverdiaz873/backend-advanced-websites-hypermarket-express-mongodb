import { Router } from "express";
import * as statsController from "../controllers/stats.controller";
import authMiddleware, { authorizeRole } from "../../../shared/middleware/auth.middleware";

const router = Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", statsController.getOverview);
router.get("/overview", statsController.getOverview);

router.get("/dashboard", statsController.getDashboard);
router.get("/revenue", statsController.getRevenue);
router.get("/orders-status", statsController.getOrdersByStatus);
router.get("/top-products", statsController.getTopProducts);
router.get("/category-sales", statsController.getCategorySales);
router.get("/inventory-summary", statsController.getInventorySummary);

export default router;