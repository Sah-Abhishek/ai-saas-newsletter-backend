import mongoose, { Schema } from "mongoose";

const QuestionSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
      min: 1,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    option: {
      type: [String],
      required: true,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
  },
);

const QuizSchema = new Schema(
  {
    userEmail: {
      type: String,
      required: true
    },
    newsletterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Newsletter",
      required: true,
      index: true,
    },
    questions: {
      type: [QuestionSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: "Quiz must contain at least one question.",
      },
      required: true,
    },
    solved: {
      type: Boolean,
      default: false,
    },
    marksObtained: {
      type: Number,
      default: 0,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", QuizSchema);
