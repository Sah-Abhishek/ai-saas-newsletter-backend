
// src/controllers/authController.js
import { handleAdminSignup, handleLogin, handleUserSignup } from "../services/authService.js";

export const signupAdmin = async (req, res, next) => {
  try {
    const data = await handleAdminSignup(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
export const signupUser = async (req, res, next) => {
  try {
    const data = await handleUserSignup(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};



export const loginUser = async (req, res, next) => {
  try {
    const data = await handleLogin(req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
