import axios from "axios";
import Client from "../models/ClientModel.js";

export const getNews = async (req, res) => {
  try {
    const email = req.userEmail;
    if (!email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const client = await Client.findOne({ email });
    const topics = client?.subscribedTopics || [];
    const query = topics.length ? topics.join(" OR ") : "trending news";

    const NEWS_API_KEY = process.env.NEWS_API_KEY;
    const response = await axios.get(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=30&apiKey=${NEWS_API_KEY}`
    );

    const articles = (response.data.articles || [])
      .filter((a) => a.title && a.title !== "[Removed]" && a.urlToImage)
      .map((a) => ({
        title: a.title,
        description: a.description,
        url: a.url,
        image: a.urlToImage,
        source: a.source?.name || "Unknown",
        publishedAt: a.publishedAt,
        author: a.author,
      }));

    return res.json({ success: true, articles, topics });
  } catch (err) {
    console.error("Error fetching news:", err.message);
    return res.status(500).json({ success: false, message: "Failed to fetch news" });
  }
};
