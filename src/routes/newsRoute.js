import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getNews } from "../controllers/newsController.js";

const router = express.Router();

router.get("/", authMiddleware, getNews);

export default router;
