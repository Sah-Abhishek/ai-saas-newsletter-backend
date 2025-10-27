// src/models/clientModel.js
import mongoose from "mongoose";
import User from "./UserModel.js";

const clientSchema = new mongoose.Schema({
  // Topics the user selected during onboarding
  subscribedTopics: {
    type: [String],
    default: [],
  },
  frequency: {
    type: String,
    enum: ["daily", "weekly", "biweekly"],
    default: "weekly"
  },

  // Where the user heard about your platform
  heardAboutUs: {
    type: String,
    trim: true,
    default: "",
  },

  // What best describes the user
  userType: {
    type: String,
    trim: true,
    default: "",
  },

  // Optional: Track onboarding completion state
  onboardingCompleted: {
    type: Boolean,
    default: false,
  },

  onboardingCompletedAt: {
    type: Date,
  },
});

const Client = User.discriminator("Client", clientSchema);

export default Client;
