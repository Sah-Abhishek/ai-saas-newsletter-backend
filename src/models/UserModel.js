const mongoose = require('mongoose');

// ====================================================================
// Mock Bcrypt Implementation for Demo
// (In production, use `const bcrypt = require('bcryptjs')`)
// ============================
const bcrypt = require('bcryptjs');

// ====================================================================
// Define Base User Schema
// ====================================================================

const options = { discriminatorKey: "role", timestamps: true };

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false,
    },
  },
  options // ✅ now properly applied
);

// ====================================================================
// Password Hash Middleware
// ====================================================================
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ====================================================================
// Export Base Model
// ====================================================================
module.exports = mongoose.model("User", userSchema);
