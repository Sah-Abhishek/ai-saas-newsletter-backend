
// src/models/adminModel.js
import mongoose from "mongoose";
import User from "./UserModel.js";

const adminSchema = new mongoose.Schema({});

const Admin = User.discriminator("admin", adminSchema);
export default Admin;
