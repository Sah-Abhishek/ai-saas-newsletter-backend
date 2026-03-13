
// src/routes/settingsRoute.js
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getNewsletterSchedule, setNewsletterSchedule, getSubscribedTopics, setSubscribedTopics } from "../controllers/settingsController.js";

const router = express.Router();

router.get("/newsletterschedule", authMiddleware, getNewsletterSchedule);
router.post("/setnewsletterschedule", authMiddleware, setNewsletterSchedule);
router.get("/topics", authMiddleware, getSubscribedTopics);
router.post("/settopics", authMiddleware, setSubscribedTopics);

export default router;
