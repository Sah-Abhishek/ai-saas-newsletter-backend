import { Inngest } from "inngest";

// Initialize Inngest client
export const inngest = new Inngest({
  id: "newsletter-app",
  name: "Newsletter App",
  apiKey: process.env.INNGEST_EVENT_KEY,
});
