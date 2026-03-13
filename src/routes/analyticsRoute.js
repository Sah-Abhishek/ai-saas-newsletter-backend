


// src/routes/authRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOpenedAnalytics } from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/opened", authMiddleware, getOpenedAnalytics);

export default router;
