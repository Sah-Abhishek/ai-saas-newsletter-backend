
// src/app.js
import express from "express";
import { serve } from "inngest/express";

import authRoutes from "./routes/authRoutes.js";
import onBoardRoute from "./routes/onBoardRoute.js"
import { inngest } from "./inggest.js";
import { sendNewsletter } from "./functions/sendNewsletter.js";
import { generateNewsletter } from "./functions/newsletterGenerator.js";
import newsletterRoute from "./routes/newsletterRoute.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const inngestHandler = serve({
  client: inngest,
  functions: [sendNewsletter, generateNewsletter],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

app.get("/inngest", inngestHandler);
app.post("/inngest", inngestHandler);
app.put("/inngest", inngestHandler);

// Mount all feature routers
app.use("/auth", authRoutes);
app.use("/onboard", onBoardRoute)
app.use("/newsletter", newsletterRoute)

console.log("📬 Registered Inngest Functions:");
[sendNewsletter].forEach((fn) => {
  const triggers =
    fn?.options?.triggers?.map((t) => t.event) ||
    fn?.config?.triggers?.map((t) => t.event) ||
    ["⚠️ unknown"];
  console.log(`→ ${fn.name || "Unnamed function"} listens for:`, triggers);
});




export default app;
