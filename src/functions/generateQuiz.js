import chalk from "chalk";
import { inngest } from "../inggest.js";
import Newsletter from "../models/NewsLetterModel.js";
import Quiz from "../models/QuizModel.js";
import OpenAI from "openai";

/**
 * Inngest function: Generates a quiz for a given newsletter.
 * Triggered by event: "newsletter.quiz.generate"
 */
export const generateQuiz = inngest.createFunction(
  {
    id: "generate-quiz",
    // ✅ ADDED: Prevent duplicate quiz generation for same newsletter
    idempotency: 'event.id'  // ✅ Correct
  },
  { event: "newsletter.quiz.generate" },
  async ({ event, step }) => {
    // 1️⃣ Fetch the newsletter
    const email = event.data.userEmail;
    const newsletterId = event.data.newsletterId;

    console.log(`🎯 [QUIZ GENERATION START] Newsletter ID: ${newsletterId} | User: ${email}`);

    const newsletter = await Newsletter.findById(newsletterId);
    if (!newsletter) throw new Error("Newsletter not found");

    // ✅ CHECK: If quiz already exists, skip generation
    const existingQuiz = await Quiz.findOne({ newsletterId });
    if (existingQuiz) {
      console.log(`⏭️ [QUIZ SKIPPED] Quiz already exists for newsletter: ${newsletterId}`);
      return {
        success: true,
        skipped: true,
        newsletterId,
        message: "Quiz already exists"
      };
    }

    // 2️⃣ Prepare AI prompt
    const prompt = `
You are an expert educational content generator.
Based on the following newsletter summary, create 15 multiple-choice questions (MCQs)
that test comprehension and critical understanding.

Each question should:
- Be clear and fact-based from the summary.
- Have exactly 4 answer options.
- Include one correct option (indicated by its index number: 0, 1, 2, or 3).
- Include a brief explanation (1-2 sentences) of why the correct answer is right.
- Avoid "All of the above" or duplicate options.
- Keep questions concise and relevant.

Return ONLY a valid JSON array — no markdown, no commentary.
Format exactly like this:
[
  {
    "number": 1,
    "question": "What is the main topic discussed in the newsletter?",
    "option": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 2,
    "explanation": "The newsletter primarily focused on Option C because..."
  },
  ...
]

Newsletter summary:
"""
${newsletter.summary}
"""
`;

    // 3️⃣ Generate quiz content with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log(`🤖 [CALLING OPENAI] Generating quiz for newsletter: ${newsletterId}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    // 4️⃣ Extract text safely
    let rawText = response.choices[0]?.message?.content || "";
    rawText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 5️⃣ Parse JSON output
    let quizData;
    try {
      quizData = JSON.parse(rawText);

      if (!Array.isArray(quizData)) {
        throw new Error("Parsed response is not an array");
      }

      console.log(`✅ [QUIZ PARSED] ${quizData.length} questions generated`);

    } catch (err) {
      console.error("❌ Failed to parse OpenAI JSON:", err);
      console.error("OpenAI output:", rawText);
      throw new Error("OpenAI returned invalid JSON format");
    }

    // 6️⃣ Save quiz in MongoDB
    await Quiz.create({
      userEmail: email,
      newsletterId: newsletter._id,
      questions: quizData,
    });

    console.log(
      chalk.bgGreen.black.bold(
        ` ✅ [QUIZ SAVED] `
      ) +
      chalk.green(` Quiz generated successfully for newsletter: `) +
      chalk.yellow(`${newsletter._id}`)
    );

    // 7️⃣ Return for Inngest logs
    return {
      success: true,
      newsletterId: newsletter._id,
      questionCount: quizData.length,
    };
  }
);
