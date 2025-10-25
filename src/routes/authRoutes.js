
// src/routes/authRoutes.js
import express from "express";
import { loginUser, signupAdmin, signupUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", signupUser);
router.post("/adminsignup", signupAdmin);

export default router;
