const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { sendEmail } = require("../config/sendEmail");

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2h" });
};

// @desc Register user & send OTP
// @desc Register user & send OTP
exports.register = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // 🔥 pre-save hook will hash
      isVerified: false,
      photo: req.file ? `/uploads/${req.file.filename}` : null,
    });

    // Assign unique referralCode (last 6 chars of _id)
    user.referralCode = user._id.toString().slice(-6).toUpperCase();

    // If referralCode is provided → link to referrer
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        user.referredBy = referrer._id;
        referrer.referrals.push(user._id);
        referrer.balance = (referrer.balance || 0) + 10; // reward
        await referrer.save();
      }
    }

    await user.save();

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000); // 6-digit
    await Otp.create({
      email,
      otp: otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
    });

    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <img src="https://i.ibb.co/FnzyjD4/crypto-royal-logo.png" alt="Crypto Royal" width="80"/>
        <h2 style="color: #4b0082;">Welcome to Crypto Royal</h2>
        <p>Your OTP code is:</p>
        <h1 style="color: #ff6600;">${otpCode}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
`;
    await sendEmail(email, "Verify your Crypto Royal account", html);

    res.status(201).json({ message: "OTP sent to email. Please verify." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpDoc = await Otp.findOne({ email, otp });
    console.log("Finding OTP with:", { email, otp });
    console.log("DB result:", otpDoc);
    if (!otpDoc) return res.status(400).json({ message: "Invalid OTP" });

    if (otpDoc.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    await User.updateOne({ email }, { isVerified: true });
    await Otp.deleteOne({ _id: otpDoc._id });

    res.json({ message: "Account verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res
        .status(401)
        .json({ message: "Please verify your account first" });
    }

    const token = generateToken(user._id);
    console.log(user.role);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      photo: user.photo,
      role: user.role,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <img src="https://i.ibb.co/FnzyjD4/crypto-royal-logo.png" alt="Crypto Royal" width="80"/>
        <h2 style="color: #4b0082;">Reset Your Password</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="background:#4b0082;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">
          Reset Password
        </a>
        <p>This link expires in 15 minutes.</p>
      </div>
    `;
    await sendEmail(email, "Crypto Royal - Password Reset", html);

    res.json({ message: "Password reset link sent" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
    console.error(error.message);
  }
};

// ✅ Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: "Invalid token" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Invalid or expired token" });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, type = "register" } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // If registering but already verified
    if (type === "register" && user.isVerified) {
      return res.status(400).json({ message: "User already verified" });
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000);

    // Save or update OTP in DB
    await Otp.findOneAndUpdate(
      { email },
      {
        otp: otpCode,
        purpose: type,
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
      { upsert: true, new: true }
    );

    // Subject + HTML email
    const subject =
      type === "forgotPassword"
        ? "Password Reset OTP"
        : "Verify Your Account - New OTP";

    const html = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2 style="color:#4b0082;">Crypto Royal</h2>
        <p>
          ${
            type === "forgotPassword"
              ? "You requested a password reset. Use the OTP below:"
              : "Here is your new OTP to verify your account:"
          }
        </p>
        <h1 style="color:#ff6600; letter-spacing: 3px;">${otpCode}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;

    await sendEmail(email, subject, html);

    res.json({ message: `New OTP sent to email for ${type}` });
  } catch (error) {
    console.error("❌ resendOtp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const otp = crypto.randomInt(100000, 999999).toString();
    req.user.otp = otp;
    console.log(otp);
    req.user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min
    await req.user.save();

    await sendEmail(req.user.email, "Your OTP Code", `Your OTP is ${otp}`);
    res.json({ message: "OTP sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Change Password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, otp } = req.body;
    const user = await User.findById(req.user.id);

    if (!newPassword) {
      return res.status(400).json({ message: "New password required." });
    }

    if (oldPassword) {
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch)
        return res.status(400).json({ message: "Old password incorrect." });
    } else if (otp) {
      if (!user.otp || user.otp !== otp || user.otpExpires < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP." });
      }
      user.otp = undefined;
      user.otpExpires = undefined;
    } else {
      return res.status(400).json({ message: "Provide old password or OTP." });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
