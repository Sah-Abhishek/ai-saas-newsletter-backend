import nodemailer from "nodemailer";
import { marked } from "marked";
import { parse } from 'jsonc-parser';

import { inngest } from "../inggest.js";
import OpenAI from "openai";
import axios from "axios";
import Client from "../models/ClientModel.js";
import Newsletter from "../models/NewsLetterModel.js";
import z from "zod";

export const generateNewsletter = inngest.createFunction(
  {
    id: "generateNewsletter",
    name: "Generate Newsletter",
    idempotency: 'event.id',
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

    console.log('\x1b[46m\x1b[30m%s\x1b[0m', `🔵 [EXECUTION START] Email: ${email} | Event: ${event.name}`);

    if (!email) throw new Error("Missing email in event data");

    // Step 1: Generate newsletter content and save to DB (memoized — runs only once)
    const newsletterData = await step.run("generate-newsletter-content", async () => {
      // Fetch client and topics
      const client = await Client.findOne({ email });
      if (!client) throw new Error(`Client not found for email: ${email}`);

      // Check if newsletter was already sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingNewsletter = await Newsletter.findOne({
        recipientEmail: email,
        createdAt: { $gte: today },
        status: "sent"
      });

      if (existingNewsletter) {
        console.log('\x1b[43m\x1b[30m%s\x1b[0m', `⏭️ [NEWSLETTER SKIP] Already exists for ${email} today`);
        return { skipped: true, newsletterId: existingNewsletter._id.toString() };
      }

      const topics = client.subscribedTopics || [];
      const query = topics.length ? topics.join(" OR ") : "tesla";

      console.log('\x1b[45m\x1b[37m%s\x1b[0m', `📚 [TOPICS FETCHED] ${topics.join(", ")}`);

      // Fetch news from NewsAPI
      const NEWS_API_KEY = process.env.NEWS_API_KEY;
      const newsResponse = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`
      );
      const articles = newsResponse.data.articles || [];

      console.log('\x1b[42m\x1b[30m%s\x1b[0m', `📰 [NEWS FETCHED] ${articles.length} articles`);

      const newsText = articles
        .map((a, idx) => `${idx + 1}. ${a.title} - ${a.description || ""}`)
        .join("\n\n");

      // Build prompt
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

      // Generate with OpenAI
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      let heading = "AI Newsletter";
      let summary = "No content available.";

      try {
        console.log('\x1b[41m\x1b[37m%s\x1b[0m', `🤖 [OPENAI CALL] Email: ${email}`);

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        });

        let rawText = response.choices[0]?.message?.content || "{}";

        rawText = rawText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON found in AI output");

        const parsed = parse(jsonMatch[0]);
        heading = parsed.heading?.trim() || "AI Newsletter";
        summary = parsed.summary?.trim() || "No summary provided.";

        console.log("✅ Successfully parsed JSON");
        console.log("📰 Heading:", heading);
        console.log("📝 Summary length:", summary.length, "characters");

      } catch (err) {
        console.error('\x1b[41m\x1b[37m%s\x1b[0m', `❌ [OPENAI ERROR]`, err);

        heading = "Your Weekly AI & Tech Newsletter";
        summary = `# Newsletter Update\n\nWe're currently experiencing technical difficulties generating your personalized newsletter content. Our team is working on it!\n\n## Your Topics\nYou're subscribed to updates about: **${topics.join(", ")}**\n\nPlease check back soon for your curated content.`;
      }

      // Create newsletter document
      const newsletter = await Newsletter.create({
        recipientEmail: email,
        heading,
        topics,
        summary,
        htmlContent: "",
        status: "pending",
      });

      console.log('\x1b[42m\x1b[30m%s\x1b[0m', `✅ [NEWSLETTER SAVED] _id: ${newsletter._id}`);

      // Build tracking pixel and HTML
      const trackingPixel = `<img src="${process.env.BACKEND_URL}/newsletter/open/${newsletter._id}" width="1" height="1" style="display:none;" />`;
      const markdownToHTML = marked(summary, { breaks: true });

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
${trackingPixel}
  </div>
`;

      // Update with HTML content
      newsletter.htmlContent = newsletterHTML;
      await newsletter.save();

      return {
        skipped: false,
        newsletterId: newsletter._id.toString(),
        heading,
        htmlContent: newsletterHTML,
      };
    });

    // If skipped, return early
    if (newsletterData.skipped) {
      return { success: true, skipped: true, newsletterId: newsletterData.newsletterId };
    }

    // Step 2: Send the email (memoized — runs only once)
    await step.run("send-newsletter-email", async () => {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      console.log('\x1b[44m\x1b[37m%s\x1b[0m', `📧 [SENDING EMAIL] To: ${email}`);

      await transporter.sendMail({
        from: `"Your Updates Team" <${process.env.SMTP_USER}>`,
        to: email,
        subject: newsletterData.heading || "Your Personalized Newsletter",
        html: newsletterData.htmlContent,
      });

      // Update status to "sent"
      await Newsletter.findByIdAndUpdate(newsletterData.newsletterId, { status: "sent" });

      console.log('\x1b[42m\x1b[30m%s\x1b[0m', `✅ [EMAIL SENT] Status updated to 'sent'`);
    });

    // Step 3: Trigger quiz generation
    await step.sendEvent("trigger-quiz", {
      name: "newsletter.quiz.generate",
      data: { newsletterId: newsletterData.newsletterId, userEmail: email },
      id: `quiz-${newsletterData.newsletterId}`
    });

    console.log('\x1b[46m\x1b[30m%s\x1b[0m', `🏁 [COMPLETE] Newsletter: ${newsletterData.newsletterId} | Email: ${email}`);

    return {
      success: true,
      emailSentTo: email,
      newsletterId: newsletterData.newsletterId,
    };
  }
);
