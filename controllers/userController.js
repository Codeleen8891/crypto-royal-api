const Otp = require("../models/Otp");
const User = require("../models/User");
const Message = require("../models/ChatMessage");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendEmail } = require("../config/sendEmail"); // ✅ use SendGrid instead of nodemailer

// Get profile
// controllers/userController.js
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -pin")
      .populate("referrals", "name email photo"); // include referrals

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      ...user.toObject(),
      referralsCount: user.referrals.length,
    });
  } catch (error) {
    console.error("❌ getProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      updates.photo = req.file.path.replace(/\\/g, "/");
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toObject ? user.toObject() : { ...user };
    userObj.photo = userObj.photo || userObj.avatar || "";

    res.json(userObj);
    console.log("✅ user info updated:", userObj);
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get user stats
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const shares = await User.countDocuments();
    res.json({ referrals: user.referrals.length, shares });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Get unread messages
exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.countDocuments({ to: userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

// Send OTP
exports.sendOtp = async (req, res) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    req.user.otp = otp;
    req.user.otpExpires = Date.now() + 10 * 60 * 1000;
    await req.user.save();

    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color:#4b0082;">Crypto Royal - OTP</h2>
        <p>Your OTP code is:</p>
        <h1 style="color:#ff6600;">${otp}</h1>
        <p>It will expire in 10 minutes.</p>
      </div>
    `;

    await sendEmail(req.user.email, "Your OTP Code", html);
    res.json({ message: "OTP sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Change password with old password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Old password is incorrect" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Request OTP for password reset
exports.requestPasswordOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: user.email });

    await Otp.create({
      email: user.email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color:#4b0082;">Crypto Royal - Password Reset</h2>
        <p>Your OTP to reset your password is:</p>
        <h1 style="color:#ff6600;">${otp}</h1>
        <p>This OTP will expire in 5 minutes.</p>
      </div>
    `;

    await sendEmail(user.email, "Your OTP for Password Reset", html);
    res.json({ message: "OTP sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Reset password using OTP
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { otp, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const record = await Otp.findOne({ email: user.email, otp });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    user.password = newPassword;
    await user.save();
    await Otp.deleteOne({ _id: record._id });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query is required" });

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    }).select("name email photo");

    res.json(users);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ Get user by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// @access Private
exports.getReferralInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("referrals", "name email photo") // show referred users
      .select("referralCode referrals");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      referralCode: user.referralCode,
      referrals: user.referrals,
      referralsCount: user.referrals.length,
    });
  } catch (error) {
    console.error("❌ getReferralInfo error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
