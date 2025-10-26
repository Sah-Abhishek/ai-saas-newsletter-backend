import { Inngest } from "inngest";

// Initialize Inngest client
export const inngest = new Inngest({
  id: "newsletter-app",
  name: "Newsletter App",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
