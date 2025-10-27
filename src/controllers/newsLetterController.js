import { inngest } from "../inggest.js";
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


export const triggerNewsletterSchedule = async (req, res) => {
  try {
    const { frequency, } = req.body;

    const email = req.userEmail

    if (!frequency || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: frequency and email",
      });
    }

    // Map frequency to event names
    const eventMap = {
      daily: "newsletter.schedule.daily",
      weekly: "newsletter.schedule.weekly",
      biweekly: "newsletter.schedule.biweekly",
    };

    const eventName = eventMap[frequency.toLowerCase()];

    if (!eventName) {
      return res.status(400).json({
        success: false,
        message: "Invalid frequency. Use: daily, weekly, or biweekly.",
      });
    }

    // Trigger the Inngest event manually
    await inngest.send({
      name: eventName,
      data: { email },
    });

    return res.status(200).json({
      success: true,
      message: `✅ Newsletter schedule '${frequency}' triggered successfully.`,
    });
  } catch (err) {
    console.error("❌ Failed to trigger schedule:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while triggering newsletter schedule.",
      error: err.message,
    });
  }
};
