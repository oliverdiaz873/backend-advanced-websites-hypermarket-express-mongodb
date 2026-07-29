import { Router } from "express";
import * as offerController from "../controllers/offer.controller";

const router = Router();

router.get("/", offerController.getAll);

export default router;
