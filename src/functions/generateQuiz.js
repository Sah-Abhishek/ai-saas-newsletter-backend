import { inngest } from "../inggest.js";
import Newsletter from "../models/NewsLetterModel.js";
import Quiz from "../models/QuizModel.js";
import { GoogleGenAI } from "@google/genai";

/**
 * Inngest function: Generates a quiz for a given newsletter.
 * Triggered by event: "newsletter.quiz.generate"
 */

export const generateQuiz = inngest.createFunction(
  { id: "generate-quiz" },
  { event: "newsletter.quiz.generate" },
  async ({ event, step }) => {
    // 1️⃣ Fetch the newsletter
    const email = event.data.userEmail;
    console.log("User email is this: ", email)
    const newsletter = await Newsletter.findById(event.data.newsletterId);

    if (!newsletter) throw new Error("Newsletter not found");

    // 2️⃣ Prepare AI prompt
    const prompt = `
You are an expert educational content generator.

Based on the following newsletter summary, create 15 multiple-choice questions (MCQs)
that test comprehension and critical understanding.

Each question should:
- Be clear and fact-based from the summary.
- Have exactly 4 answer options.
- Include one correct option (indicated by its index number: 0, 1, 2, or 3).
- Avoid "All of the above" or duplicate options.
- Keep questions concise and relevant.

Return ONLY a valid JSON array — no markdown, no commentary.

Format exactly like this:
[
  {
    "number": 1,
    "question": "What is the main topic discussed in the newsletter?",
    "option": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 2
  },
  ...
]

Newsletter summary:
"""
${newsletter.summary}
"""
`;

    // 3️⃣ Generate quiz content with Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    // 4️⃣ Extract text safely
    let rawText = response.text || "";
    rawText = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 5️⃣ Parse JSON output
    let quizData;
    try {
      quizData = JSON.parse(rawText);
      // console.log("This is the quiz data: ", quizData);
      if (!Array.isArray(quizData)) {
        throw new Error("Parsed response is not an array");
      }
    } catch (err) {
      console.error("❌ Failed to parse Gemini JSON:", err);
      console.error("Gemini output:", rawText);
      throw new Error("Gemini returned invalid JSON format");
    }

    // 6️⃣ Save quiz in MongoDB
    await Quiz.create({
      userEmail: email,
      newsletterId: newsletter._id,
      questions: quizData,
    });

    console.log("✅ Quiz generated successfully for newsletter:", newsletter._id);

    // 7️⃣ Return for Inngest logs
    return {
      success: true,
      newsletterId: newsletter._id,
      questionCount: quizData.length,
    };
  }
);
