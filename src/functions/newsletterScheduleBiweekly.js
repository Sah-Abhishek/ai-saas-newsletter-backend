
// backend/inngest/functions/newsletterScheduleBiweekly.js
import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const biweeklyNewsletterTrigger = inngest.createFunction(
  { id: "biweekly-newsletter-trigger" },
  { cron: "0 8 */14 * *" }, // every 14 days 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "biweekly" });

    for (const client of clients) {
      await step.sendEvent("newsletter.schedule.biweekly", {
        data: { email: client.email },
      });
    }

    return { sent: clients.length };
  }
);
