// backend/inngest/functions/newsletterScheduleWeekly.js
import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const weeklyNewsletterTrigger = inngest.createFunction(
  { id: "weekly-newsletter-trigger" },
  { cron: "0 8 * * MON" }, // every Monday 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "weekly" });

    for (const client of clients) {
      await step.sendEvent("newsletter.schedule.weekly", {
        data: { email: client.email },
      });
    }

    return { sent: clients.length };
  }
);
