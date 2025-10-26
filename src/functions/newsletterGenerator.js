import nodemailer from "nodemailer";
import { inngest } from "../inggest.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import Client from "../models/ClientModel.js";
import Newsletter from "../models/NewsLetterModel.js";

export const generateNewsletter = inngest.createFunction(
  { id: "generateNewsletter" },
  { event: "user.onboarded" },
  async ({ event, step }) => {
    const { email } = event.data;
    if (!email) throw new Error("Missing email in event data");

    // 1️⃣ Fetch user from DB to get subscribed topics
    const client = await Client.findOne({ email });
    if (!client) throw new Error(`Client not found for email: ${email}`);

    const topics = client.subscribedTopics || [];
    const query = topics.length ? topics.join(" OR ") : "tesla";

    // 2️⃣ Fetch news from NewsAPI
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(
        query
      )}&from=2025-09-26&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
    );
    const articles = newsResponse.data.articles || [];

    const newsText = articles
      .map((a, idx) => `${idx + 1}. ${a.title} - ${a.description || ""}`)
      .join("\n\n");

    // 3️⃣ Gemini AI summary
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following news articles into a concise newsletter:\n\n${newsText}`,
    });
    const summary = response.text || "No summary available.";

    // 4️⃣ Build HTML content
    const newsletterHTML = `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h1 style="color: #1e88e5;">Your Personalized Newsletter 🚀</h1>
        <p style="font-size: 16px;">Hi there 👋, here’s your curated newsletter based on your interests: <strong>${topics.join(
      ", "
    )}</strong></p>

        ${summary
        .split(/\n\n/)
        .map((section) => `<p style="margin-bottom: 12px;">${section}</p>`)
        .join("")}

        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 14px; color: #666;">
          You are receiving this newsletter because you subscribed to updates on your favorite topics.
        </p>
      </div>
    `;

    // 5️⃣ Send the newsletter via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    try {
      await step.run("send-newsletter-email", async () => {
        await transporter.sendMail({
          from: `"Your Updates Team" <${process.env.SMTP_USER}>`,
          to: email,
          subject: "Your Personalized Newsletter 🚀",
          html: newsletterHTML,
        });
      });

      // 6️⃣ Save newsletter to DB
      await Newsletter.create({
        recipientEmail: email,
        topics,
        summary,
        htmlContent: newsletterHTML,
        status: "sent",
      });

      return { success: true, emailSentTo: email };
    } catch (err) {
      console.error("Failed to send newsletter:", err);

      // Save failed attempt
      await Newsletter.create({
        recipientEmail: email,
        topics,
        summary,
        htmlContent: newsletterHTML,
        status: "failed",
      });

      throw err;
    }
  }
);
