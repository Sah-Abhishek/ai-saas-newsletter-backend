
import jwt from "jsonwebtoken";
import User from "../models/UserModel.js";

export const authMiddleware = async (req, res, next) => {
  try {
    // console.log('\x1b[30m\x1b[42m%s\x1b[0m', "This was hit")
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing or invalid" });
    }

    const token = authHeader.split(" ")[1];

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('\x1b[41m%s\x1b[0m', "This is the decoded: ", decoded);

    if (!decoded || !decoded.email) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // ✅ Optional: Check if user still exists (if you want real-time validation)
    const user = await User.findOne({ email: decoded.email });
    console.log('This is the user: ', user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Attach email (and optionally the user) to the request
    req.userEmail = decoded.email;
    req.user = user;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ message: "Unauthorized access" });
  }
};
