const Otp = require("../models/Otp"); // ✅ import your OTP model
const User = require("../models/User");
const Message = require("../models/ChatMessage"); // ✅ Added import
const bcrypt = require("bcryptjs");
const transporter = require("../config/nodemailer");

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -pin");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// controllers/userController.js
exports.updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };

    if (req.file) {
      // save the path in a forward-slash form (helps windows path issues)
      updates.photo = req.file.path.replace(/\\/g, "/");
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // convert to plain object so we can add alias fields cleanly
    const userObj = user.toObject ? user.toObject() : { ...user };

    // ensure compatibility with frontend which expects `photo`
    userObj.photo = userObj.photo || userObj.avatar || "";

    res.json(userObj);
    console.log("user info updated:", userObj);
  } catch (error) {
    console.error("updateProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    const shares = await User.countDocuments();
    res.json({
      referrals: user.referrals,
      shares,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getUnreadMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Message.countDocuments({ to: userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
exports.sendOtp = async (req, res) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    req.user.otp = otp;
    req.user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await req.user.save();

    await sendEmail(req.user.email, "Your OTP Code", `Your OTP is ${otp}`);
    res.json({ message: "OTP sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Change Password

// Change password with old password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

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

    // generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // delete old OTPs for this email
    await Otp.deleteMany({ email: user.email });

    // save new OTP
    await Otp.create({
      email: user.email,
      otp: otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    });

    // send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Your OTP for Password Reset",
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
    });

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

    // find OTP in db
    const record = await Otp.findOne({ email: user.email, otp: otp });
    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    // update password
    user.password = newPassword;
    await user.save();

    // delete used OTP
    await Otp.deleteOne({ _id: record._id });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: "Query is required" });

    // case-insensitive search by name or email
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

// GET /users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password"); // remove password
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("❌ Get user by ID error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
