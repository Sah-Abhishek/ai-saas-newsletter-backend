
// src/functions/sendNewsletter.js
import nodemailer from "nodemailer";
import { inngest } from "../inggest.js";

// Define the workflow
export const sendNewsletter = inngest.createFunction(
  { id: "send-newsletter" },
  {
    event: "user.onboarded"
  },
  async ({ event, step }) => {
    const { email, topics } = event.data;

    // Set up your mailer (use something like Resend, Mailgun, or Gmail SMTP)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await step.run("send-newsletter-email", async () => {
      const newsletterHTML = `
        <h2>Welcome aboard 🎉</h2>
        <p>Hey ${email.split("@")[0]},</p>
        <p>Thanks for joining us! You’re now subscribed to updates about:</p>
        <ul>${topics.map((t) => `<li>${t}</li>`).join("")}</ul>
      `;

      await transporter.sendMail({
        from: `"Team" <${process.env.SMTP_USER}>`,
        to: email,
        subject: "Welcome to our Newsletter!",
        html: newsletterHTML,
      });
    });

    return { success: true };
  }
);
