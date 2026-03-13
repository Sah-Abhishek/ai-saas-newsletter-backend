// backend/inngest/functions/newsletterScheduleWeekly.js
import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const weeklyNewsletterTrigger = inngest.createFunction(
  {
    id: "weekly-newsletter-trigger",
    idempotency: 'string(event.ts / 604800000)'  // ✅ CORRECT
  },
  { cron: "0 8 * * MON" }, // every Monday 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "weekly" });

    console.log(`📅 [WEEKLY CRON] Found ${clients.length} weekly subscribers`);

    for (const client of clients) {
      // Get the Monday date for this week
      const today = new Date();
      const monday = new Date(today.setDate(today.getDate() - today.getDay() + 1));
      const weekId = monday.toISOString().split('T')[0];

      await step.sendEvent("send-weekly-newsletter", {
        name: "newsletter.schedule.weekly",
        data: { email: client.email },
        id: `weekly-${client.email}-${weekId}`
      });
    }
    return { sent: clients.length };
  }
);
