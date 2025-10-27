// backend/inngest/functions/newsletterScheduleDaily.js

import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const dailyNewsletterTrigger = inngest.createFunction(
  { id: "daily-newsletter-trigger" },
  { cron: "0 8 * * *" }, // every day at 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "daily" });

    for (const client of clients) {
      await step.sendEvent("newsletter.schedule.daily", {
        data: { email: client.email },
      });
    }

    return { sent: clients.length };
  }
);
