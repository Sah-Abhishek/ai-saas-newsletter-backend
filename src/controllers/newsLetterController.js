import Newsletter from "../models/NewsLetterModel.js";


/**
 * GET /newsletters
 * Returns all newsletters stored in the database
 */
export const getAllNewsletters = async (req, res) => {
  try {
    const email = req.userEmail;
    if (!email) return res.status(401).json({ message: "Unauthorized" });

    const newsletters = await Newsletter.find({ recipientEmail: email })
      .sort({ sentAt: -1 }) // latest first
      .lean(); // returns plain JS objects

    if (!newsletters.length) {
      return res.status(200).json({ message: "No newsletters found", newsletters: [] });
    }

    return res.status(200).json({ newsletters });
  } catch (error) {
    console.error("Error fetching newsletters:", error);
    return res.status(500).json({ message: "Failed to fetch newsletters" });
  }
};
