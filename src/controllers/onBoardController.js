import Client from "../models/ClientModel.js";
// import mongoose from "mongoose";

import User from "../models/UserModel.js";

/**
 * @desc    Save user onboarding info (role, source, topics)
 * @route   POST /api/onboard
 * @access  Private (requires JWT)
 */
export const onboardUser = async (req, res) => {
  console.log("This is the cliend modal: ", Client)
  try {
    // console.log(mongoose.modelNames())
    const { userType, source, topics } = req.body;


    // Basic input validation
    if (!userType || !source || !Array.isArray(topics)) {
      return res.status(400).json({ message: "Invalid or incomplete onboarding data" });
    }

    const email = req.userEmail;
    console.log("This is the email: ", email);

    if (!email) {
      return res.status(401).json({ message: "Unauthorized: Missing user email" });
    }
    console.log("This is the email: ", email);

    // Find the user document
    const client = await Client.findOne({ email });
    console.log('\x1b[41m%s\x1b[0m', "This is the client from the onboardController: ", client);
    if (!client) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("These are the body: ", topics, source, userType)

    // Update onboarding fields
    client.subscribedTopics = topics;
    client.heardAboutUs = source;
    client.userType = userType;
    client.onboardingCompleted = true;

    console.log("This is the updated client: ", client);

    await client.save();

    return res.status(200).json({
      message: "Onboarding completed successfully",
      user: {
        email: client.email,
        role: client.roleDescription,
        source: client.heardAboutUs,
        topics: client.subscribedTopics,
      },
    });
  } catch (error) {
    console.error("Onboard Controller Error:", error);
    return res.status(500).json({ message: "Server error during onboarding" });
  }
};
