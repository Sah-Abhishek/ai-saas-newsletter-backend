
// src/app.js
import express from "express";
import authRoutes from "./routes/authRoutes.js";
import { onboardUser } from "./controllers/onBoardController.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import onBoardRoute from "./routes/onBoardRoute.js"

const app = express();

// Mount all feature routers
app.use("/auth", authRoutes);
app.use("/onboard", onBoardRoute)

// You can easily scale this:
/// app.use("/users", userRoutes);
/// app.use("/projects", projectRoutes);

export default app;
