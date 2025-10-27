


// src/routes/authRoutes.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getQuiz, getUserQuizzes, submitQuiz } from "../controllers/quizesController.js";

const router = express.Router();

router.get("/", authMiddleware, getUserQuizzes);
router.get("/:id", authMiddleware, getQuiz);
router.post("/submit", authMiddleware, submitQuiz);

export default router;
