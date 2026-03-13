

// src/routes/authRoutes.js
import express from "express";
import { getAllNewsletters, getNewsletterById, getNewslettersSuggestions, setNewsletterOpened } from "../controllers/newsLetterController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getAllNewsletters);
router.post("/reschedule", authMiddleware, getAllNewsletters);
router.get("/suggestions", authMiddleware, getNewslettersSuggestions);
router.get("/open/:id", setNewsletterOpened);
router.get("/:id", authMiddleware, getNewsletterById);

export default router;
