
import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
    },
    topics: {
      type: [String],
      default: [],
    },
    summary: {
      type: String,
      required: true,
    },
    htmlContent: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      default: "sent",
    },
  },
  { timestamps: true }
);

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;
