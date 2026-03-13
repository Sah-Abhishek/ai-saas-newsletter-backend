// backend/inngest/functions/newsletterScheduleBiweekly.js
import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const biweeklyNewsletterTrigger = inngest.createFunction(
  {
    id: "biweekly-newsletter-trigger",
    idempotency: 'string(event.ts / 1209600000)'  // ✅ CORRECT
  },
  { cron: "0 8 */14 * *" }, // every 14 days 8 AM UTC
  async ({ step }) => {
    const clients = await Client.find({ frequency: "biweekly" });

    console.log(`📅 [BIWEEKLY CRON] Found ${clients.length} biweekly subscribers`);

    for (const client of clients) {
      // Calculate biweekly period ID (e.g., "2025-W01", "2025-W03")
      const today = new Date();
      const weekNumber = Math.floor(today.getDate() / 14);
      const periodId = `${today.getFullYear()}-${today.getMonth() + 1}-P${weekNumber}`;

      await step.sendEvent("send-biweekly-newsletter", {
        name: "newsletter.schedule.biweekly",
        data: { email: client.email },
        id: `biweekly-${client.email}-${periodId}`
      });
    }
    return { sent: clients.length };
  }
);
