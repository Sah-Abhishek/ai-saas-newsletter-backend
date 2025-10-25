

// src/routes/authRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { onboardUser } from "../controllers/onBoardController.js";

const router = express.Router();

router.post("/", authMiddleware, onboardUser);

export default router;
