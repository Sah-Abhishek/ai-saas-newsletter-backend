import nodemailer from "nodemailer";
import { marked } from "marked";

import { inngest } from "../inggest.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import Client from "../models/ClientModel.js";
import Newsletter from "../models/NewsLetterModel.js";
import z from "zod";

export const generateNewsletter = inngest.createFunction(
  {
    id: "generateNewsletter",
    name: "Generate Newsletter",
    schemas: {
      data: z.object({
        email: z.string().email(),
      }),
    },
  },
  {
    event: "user.onboarded"
    // trigger: [
    //   { event: "user.onboarded" },
    //   { event: "newsletter.schedule.daily" },
    //   { event: "newsletter.schedule.weekly" },
    //   { event: "newsletter.schedule.biweekly" },
    // ],
  },

  async ({ event, step }) => {
    const { email } = event.data;
    console.log('\x1b[41m\x1b[37m%s\x1b[0m', "This is the email in the newslettergenerator: ", email);
    if (!email) throw new Error("Missing email in event data");

    // 1️⃣ Fetch client and topics
    const client = await Client.findOne({ email });
    if (!client) throw new Error(`Client not found for email: ${email}`);

    const topics = client.subscribedTopics || [];
    const query = topics.length ? topics.join(" OR ") : "tesla";

    // 2️⃣ Fetch news from NewsAPI
    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    const newsResponse = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
    );
    const articles = newsResponse.data.articles || [];

    const newsText = articles
      .map((a, idx) => `${idx + 1}. ${a.title} - ${a.description || ""}`)
      .join("\n\n");

    // 3️⃣ Build Gemini prompt
    const prompt = `
Summarize the following news articles into a concise newsletter.
Return ONLY valid JSON with two keys: "heading" and "summary".
Do not include any extra text or explanation.
The summary must include Markdown or HTML formatting (bold, headings, lists).
The summary should be at least 1000 words or 5000 characters.
\n\n${newsText}
`;

    // 4️⃣ Generate with Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const rawText = response.text || "";
    console.log("\x1b[44m%s\x1b[0m", "Gemini raw output:", rawText);

    // 5️⃣ Parse JSON safely
    let parsed;
    try {
      // Clean up if Gemini wraps JSON in markdown
      const cleanText = rawText.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleanText);
    } catch (err) {
      console.error("❌ Failed to parse JSON from Gemini. Using fallback structure.", err);
      parsed = {
        heading: "AI Newsletter Update",
        summary: rawText || "No summary available.",
      };
    }

    const { heading, summary } = parsed;

    const markdownToHTML = marked(summary, { breaks: true }); // converts markdown → HTML


    // 6️⃣ Build newsletter HTML
    const newsletterHTML = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
    <h1 style="color: #1e88e5;">${heading}</h1>
    <p style="font-size: 16px;">Hi there 👋, here’s your curated newsletter based on your interests: <strong>${topics.join(", ")}</strong></p>

    <div style="font-size: 15px;">
      ${markdownToHTML}
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
    <p style="font-size: 14px; color: #666;">
      You are receiving this newsletter because you subscribed to updates on your favorite topics.
    </p>
  </div>
`;
    // 7️⃣ Send newsletter email
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
          subject: heading || "Your Personalized Newsletter 🚀",
          html: newsletterHTML,
        });
      });

      // 8️⃣ Save newsletter in DB
      const newsletter = await Newsletter.create({
        recipientEmail: email,
        heading,
        topics,
        summary,
        htmlContent: newsletterHTML,
        status: "sent",
      });

      // Trigger quiz generation
      await step.sendEvent("trigger-quiz", {
        name: "newsletter.quiz.generate",
        data: { newsletterId: newsletter._id, userEmail: email },
      });

      return { success: true, emailSentTo: email, newsletterId: newsletter._id };
    } catch (err) {
      console.error("Failed to send newsletter:", err);
      await Newsletter.create({
        recipientEmail: email,
        heading,
        topics,
        summary,
        htmlContent: newsletterHTML,
        status: "failed",
      });
      throw err;
    }
  }
);
