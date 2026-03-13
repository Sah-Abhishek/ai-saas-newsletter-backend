
// backend/inngest/functions/newsletterScheduleDaily.js
import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const dailyNewsletterTrigger = inngest.createFunction(
  {
    id: "daily-newsletter-trigger",
    // Prevent duplicate cron executions
    idempotency: 'string(event.ts / 86400000)'  // ✅ CORRECT
  },
  { cron: "0 8 * * *" }, // every day at 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "daily" });

    console.log(`📅 [DAILY CRON] Found ${clients.length} daily subscribers`);

    for (const client of clients) {
      // 🔑 Add unique event ID to prevent duplicates
      await step.sendEvent("send-daily-newsletter", {
        name: "newsletter.schedule.daily",
        data: { email: client.email },
        // Use date + email as unique ID - prevents duplicates within 24h
        id: `daily-${client.email}-${new Date().toISOString().split('T')[0]}`
      });
    }
    return { sent: clients.length };
  }
);
