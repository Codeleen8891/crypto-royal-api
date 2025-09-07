// controllers/adminController.js
const User = require("../models/User");
const Message = require("../models/ChatMessage");

// controllers/adminController.js
exports.getMe = async (req, res) => {
  try {
    // req.user is guaranteed to be an admin by authAdmin
    const admin = await User.findById(req.user._id).select("-password");
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    res.json(admin);
  } catch (err) {
    console.error("❌ getMe error:", err);
    res.status(500).json({ error: "Failed to fetch admin profile" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).select(
      "-password"
    );
    console.log(users);

    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

exports.getUsersList = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } }).select(
      "-password"
    );

    const withUnread = await Promise.all(
      users.map(async (u) => {
        const unread = await Message.countDocuments({
          receiver: u._id,
          read: false,
        });
        return { ...u.toObject(), unread };
      })
    );

    res.json(withUnread);
  } catch {
    res.status(500).json({ error: "Failed to fetch user list" });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const referrals = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$referrals" } } },
    ]);
    res.json({ totalUsers, referrals: referrals[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
