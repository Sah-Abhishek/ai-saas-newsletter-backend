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


/**
 * @desc Fetch 10 newsletters not belonging to the logged-in user
 * @route GET /api/newsletters/suggested?email=<user-email>
 * @access Private (depends on your auth layer)
 */
export const getNewslettersSuggestions = async (req, res) => {
  try {
    const userEmail = req.userEmail;

    if (!userEmail) {
      return res.status(400).json({ error: "Missing email parameter." });
    }

    // Fetch 10 random newsletters where recipientEmail != user's email
    const suggested = await Newsletter.aggregate([
      { $match: { recipientEmail: { $ne: userEmail } } },
      { $sample: { size: 10 } }, // randomly pick 10
      {
        $project: {
          _id: 1,
          heading: 1,
          topics: 1,
          createdAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: suggested.length,
      newsletters: suggested,
    });
  } catch (error) {
    console.error("❌ Error fetching suggested newsletters:", error);
    return res.status(500).json({
      success: false,
      error: "Server error while fetching suggested newsletters.",
    });
  }
};



/**
 * @desc    Get a specific newsletter for an authenticated user
 * @route   GET /api/newsletters/:newsletterId
 * @access  Private
 */
export const getNewsletterById = async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.userEmail; // set by authMiddleware

    if (!id) {
      return res.status(400).json({ success: false, message: "Newsletter ID is required." });
    }

    if (!userEmail) {
      return res.status(401).json({ success: false, message: "Unauthorized request." });
    }

    const newsletter = await Newsletter.findById(id);

    if (!newsletter) {
      return res.status(404).json({ success: false, message: "Newsletter not found." });
    }

    // Optionally, ensure user has access to this newsletter (if needed)
    // e.g., check if userEmail is in newsletter.recipients or similar

    return res.status(200).json({
      success: true,
      newsletter: newsletter,
    });
  } catch (error) {
    console.error("Error fetching newsletter:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching newsletter.",
    });
  }
};


export const setNewsletterOpened = async (req, res) => {
  const { id } = req.params;

  console.log('\x1b[41m\x1b[37m%s\x1b[0m', "This was called ------------------------------------------------------", id)
  try {
    const response = await Newsletter.findByIdAndUpdate(id, { opened: true, });
    console.log("This is the response: ", response.opened);
  } catch (error) {
    console.log("Error while writing it opened", error)
  }
  const img = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6lP0l8AAAAASUVORK5CYII=", "base64");
  res.writeHead(200, { "Content-Type": "image/png", "Content-Length": img.length, "Cache-Control": "no-cache, no-store, must-revalidate" });
  res.end(img);
};
