
import Quiz from "../models/QuizModel.js";

/**
 * @desc Get all quizzes for the authenticated user
 * @route GET /api/quiz
 * @access Private (requires auth middleware)
 */
export const getUserQuizzes = async (req, res) => {
  try {
    // 1️⃣ Extract user email from auth middleware
    const userEmail = req.userEmail;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: "User email missing from authentication context.",
      });
    }

    // 2️⃣ Fetch quizzes for this user, sorted by newest first
    const quizzes = await Quiz.find({ userEmail })
      .populate("newsletterId", "solved createdAt topics").select("solved marksObtained generatedAt newsletterId")// include newsletter details
      .sort({ createdAt: -1 });

    // 3️⃣ Handle empty state
    if (!quizzes.length) {
      return res.status(200).json({
        success: true,
        message: "No quizzes found for this user.",
        quizzes: [],
      });
    }

    // 4️⃣ Respond with data
    return res.status(200).json({
      success: true,
      count: quizzes.length,
      quizzes,
    });
  } catch (error) {
    console.error("❌ Error fetching quizzes:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching quizzes.",
    });
  }
};


export const getQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "quizId is required in the URL parameter"
      })
    }

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      })
    }

    return res.status(200).json({
      success: true,
      quiz
    })

  } catch (error) {
    console.log("There was and error sending the quiz", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    })

  }
}


/**
 * @desc Submit quiz responses and calculate score
 * @route POST /api/quiz/:id/submit
 * @access Private (requires auth)
 */
export const submitQuiz = async (req, res) => {
  try {
    const { quizId, responses } = req.body;

    if (!quizId || !Array.isArray(responses)) {
      return res.status(400).json({ success: false, message: "Invalid request body." });
    }

    // ✅ Fetch quiz from DB
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: "Quiz not found." });
    }

    // if (quiz.solved) {
    //   return res.status(400).json({ success: false, message: "Quiz already submitted." });
    // }

    // ✅ Evaluate responses
    let score = quiz.marksObtained;
    const results = [];

    quiz.questions.forEach((q) => {
      const userResponse = responses.find((r) => r.questionId === q._id.toString());

      if (!userResponse || userResponse.selectedAnswer === null) {
        results.push({
          questionId: q._id,
          correct: false,
          selected: null,
          correctAnswer: q.correctAnswer,
        });
        return;
      }

      // Compare as string because correctAnswer is stored as string
      const isCorrect = userResponse.selectedAnswer.toString() === q.correctAnswer.toString();
      if (isCorrect) score++;

      results.push({
        questionId: q._id,
        selected: userResponse.selectedAnswer,
        correctAnswer: q.correctAnswer,
        correct: isCorrect,
      });
    });

    // ✅ Update quiz
    quiz.solved = true;
    quiz.marksObtained = score;
    await quiz.save();

    return res.status(200).json({
      success: true,
      message: "Quiz submitted successfully.",
      totalQuestions: quiz.questions.length,
      correctAnswers: score,
      marksObtained: score,
      results,
    });
  } catch (err) {
    console.error("Error submitting quiz:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
