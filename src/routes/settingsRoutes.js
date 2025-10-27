
// src/routes/settingsRoute.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getNewsletterSchedule, setNewsletterSchedule } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/newsletterschedule", authMiddleware, getNewsletterSchedule);
router.post("/setnewsletterschedule", authMiddleware, setNewsletterSchedule);

export default router;
