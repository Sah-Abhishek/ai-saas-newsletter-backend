

// src/routes/authRoutes.js
import express from "express";
import { getAllNewsletters } from "../controllers/newsLetterController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAllNewsletters);

export default router;
