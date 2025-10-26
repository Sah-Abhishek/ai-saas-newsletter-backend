
// src/services/authService.js
import User from "../models/UserModel.js";
import Client from "../models/ClientModel.js";
import Admin from "../models/AdminModel.js";
import bcrypt from "bcryptjs"
import jwt from 'jsonwebtoken'

export const generateToken = (email) => {
  console.log("This is the email in the generateToken: ", email)
  const payload = {
    email: email,
  }

  console.log("And this is the payload: ", payload);

  const token = jwt.sign(payload, process.env.JWT_SECRET || "supersecretkey", {
    expiresIn: "7d"
  })

  return token

}

export const handleAdminSignup = async (payload) => {
  const { name, email, password, } = payload;

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("Email is already registered");
  }

  let newUser;

  newUser = await Admin.create({ name, email, password });

  return {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    createdAt: newUser.createdAt,
    token
  };
};

export const handleUserSignup = async (payload) => {
  const { name, email, password, } = payload;

  if (!name || !email || !password) {
    throw new Error("Name, email, and password are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new Error("Email is already registered");
  }

  let newUser;

  newUser = await Client.create({ name, email, password });
  // console.log("Tihs is the user email: ", email)
  const token = generateToken(email);


  return {
    id: newUser._id,
    name: newUser.name,
    email: newUser.email,
    token,
    createdAt: newUser.createdAt,
  };
};

export const handleLogin = async (payload) => {
  const { email, password } = payload;

  const user = await User.findOne({ email }).select("+password +role");
  console.log("This is the user: ", user);
  if (!user) throw new Error("Invalid credentials");

  //compare the password
  const isMatch = await bcrypt.compare(password, user.password);
  console.log('\x1b[31m%s\x1b[0m', "This is the value of isMatch variable: ", isMatch);
  if (!isMatch) {
    throw new Error("Invalid Credentials")
  }
  const token = generateToken(email);

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      ...(user.role === "Client" ? { subscribedTopics: user.subscribedTopics } : {}),
    },
  };
}
