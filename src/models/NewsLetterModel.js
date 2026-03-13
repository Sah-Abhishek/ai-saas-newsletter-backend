
import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
    },
    heading: {
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
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["sent", "pending", "failed"],
      default: "sent",
    },
    opened: {
      type: Boolean,
      default: false
    }

  },
  { timestamps: true }
);

const Newsletter = mongoose.model("Newsletter", newsletterSchema);

export default Newsletter;
