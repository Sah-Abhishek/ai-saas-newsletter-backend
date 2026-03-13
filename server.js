// server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import morgan from "morgan";

import connectDB from "./src/config/db.js";
import app from "./src/app.js"; // the app-level routes (with /auth etc.)
app.use(cors());

// Connect to DB
connectDB();

const server = express();

// ===== Global Middlewares =====
server.use(cors());
server.use(express.json());
server.use(morgan("dev"));

// ===== Health Check =====
server.get("/", (req, res) => {
  res.send("API is running and healthy");
});

server.get("/health", async (req, res) => {
  const { default: mongoose } = await import("mongoose");
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.json({
    status: "ok",
    uptime: process.uptime(),
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ===== All API Routes under /api =====
server.use("/api", app);

// ===== Centralized Error Handler =====
// server.use(errorHandler);

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server live at http://localhost:${PORT}`)
);
