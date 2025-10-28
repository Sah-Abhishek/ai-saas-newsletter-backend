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
  [
    { event: "user.onboarded" },
    { event: "newsletter.schedule.daily" },
    { event: "newsletter.schedule.weekly" },
    { event: "newsletter.schedule.biweekly" },
  ],

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

    // 3️⃣ Build Gemini prompt - STRICT JSON INSTRUCTION
    const prompt = `You are a JSON API. You must respond with ONLY valid JSON, nothing else.

Create a newsletter from these articles. Return your response in this EXACT JSON format:

{
  "heading": "your engaging newsletter title here",
  "summary": "your comprehensive newsletter summary here with markdown formatting like ### headings, **bold text**, and bullet lists. Make this at least 1000 words covering the key stories about ${topics.join(", ")}."
}

CRITICAL: 
- Output ONLY the JSON object
- No markdown code blocks
- No explanations before or after
- Escape all special characters in strings
- Use \\n for line breaks within the summary string

News articles to summarize:
${newsText}

Remember: Output ONLY valid JSON, starting with { and ending with }`;

    // 4️⃣ Generate with Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    let heading = "AI Newsletter";
    let summary = "No content available.";
    let response;

    try {
      response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",  // Changed to correct model name
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          topP: 0.8,
          topK: 40,
        }
      });

      let rawText = response.text || "{}";
      console.log("\x1b[44m%s\x1b[0m", "Gemini raw output (first 300 chars):", rawText.substring(0, 300));

      // Clean the response
      rawText = rawText.trim();

      // Remove markdown code blocks if present
      rawText = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

      // Extract JSON object if there's extra text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawText = jsonMatch[0];
      }

      const parsed = JSON.parse(rawText);
      heading = parsed.heading?.trim() || "AI Newsletter";
      summary = parsed.summary?.trim() || "No summary provided.";

      console.log("✅ Successfully parsed JSON from Gemini");
      console.log("📰 Heading:", heading);
      console.log("📝 Summary length:", summary.length, "characters");

    } catch (err) {
      console.error("❌ Error generating or parsing newsletter:", err);
      if (response?.text) {
        console.error("Raw response that failed:", response.text.substring(0, 500));
      }

      heading = "Your Weekly AI & Tech Newsletter";
      summary = `# Newsletter Update\n\nWe're currently experiencing technical difficulties generating your personalized newsletter content. Our team is working on it!\n\n## Your Topics\nYou're subscribed to updates about: **${topics.join(", ")}**\n\nPlease check back soon for your curated content.`;
    }

    const markdownToHTML = marked(summary, { breaks: true }); // converts markdown → HTML

    // 6️⃣ Build newsletter HTML
    const newsletterHTML = `
  <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
    <h1 style="color: #1e88e5;">${heading}</h1>
    <p style="font-size: 16px;">Hi there 👋, here's your curated newsletter based on your interests: <strong>${topics.join(", ")}</strong></p>

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
