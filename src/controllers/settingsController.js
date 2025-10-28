import { inngest } from "../inggest.js";
import Client from "../models/ClientModel.js";

export const getNewsletterSchedule = async (req, res) => {
  try {

    const email = req.userEmail;

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Email not found in the auth context"
      })
    }

    const client = await Client.findOne({ email })
    if (!client) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      })
    }

    res.status(200).json({
      success: true,
      data: {
        _id: client._id,
        frequency: client.frequency
      }
    })
  } catch (error) {
    console.log("There was an error while sending the client Schedule");
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    })
  }

}



/**
 * @desc Change a user's newsletter schedule
 * @route POST /api/settings/newsletterschedule
 * @access Private (requires auth middleware)
 */
export const setNewsletterSchedule = async (req, res) => {
  try {
    const { frequency } = req.body;
    const { email } = req.user; // ✅ assuming auth middleware sets req.user

    if (!frequency || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: frequency and email",
      });
    }

    // ✅ Validate frequency
    const validFrequencies = ["daily", "weekly", "biweekly"];
    if (!validFrequencies.includes(frequency.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid frequency. Use: daily, weekly, or biweekly.",
      });
    }

    // ✅ Update Client model
    const client = await Client.findOneAndUpdate(
      { email },
      { frequency: frequency.toLowerCase() },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: "Client not found.",
      });
    }

    // ✅ Map frequency to Inngest event name
    const eventMap = {
      daily: "newsletter.schedule.daily",
      weekly: "newsletter.schedule.weekly",
      biweekly: "newsletter.schedule.biweekly",
    };

    const eventName = eventMap[frequency.toLowerCase()];

    // ✅ Trigger Inngest event (optional, if you want immediate dispatch)
    await inngest.send({
      name: eventName,
      data: { email },
    });

    return res.status(200).json({
      success: true,
      message: `✅ Newsletter frequency updated to '${frequency}'.`,
      data: client,
    });
  } catch (err) {
    console.error("❌ Failed to change schedule:", err);
    return res.status(500).json({
      success: false,
      message: "Server error while changing newsletter schedule.",
      error: err.message,
    });
  }
};
