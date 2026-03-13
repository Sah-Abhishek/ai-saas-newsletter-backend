
import Newsletter from "../models/NewsLetterModel.js";

export const getOpenedAnalytics = async (req, res) => {
  try {
    const email = req.userEmail; // assuming this is set by your auth middleware
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Fetch newsletters for this user
    const newsletters = await Newsletter.find(
      { recipientEmail: email },
      { _id: 1, topics: 1, opened: 1, sentAt: 1 } // select only _id, topics, opened
    ).sort({ sentAt: -1 }); // latest first

    return res.json({ success: true, newsletters });
  } catch (err) {
    console.error("Error fetching newsletters:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
