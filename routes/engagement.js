const express = require("express");
const User = require("../models/User");
const router = express.Router();

// Get all users (for Admin dashboard)
router.get("/", async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// Get single user (for User dashboard)
router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});

// Update referrals (likes)
router.post("/:id/referral", async (req, res) => {
  const user = await User.findById(req.params.id);
  user.referrals += 1;
  await user.save();
  res.json(user);
});

// Update shares (community engagement)
router.post("/:id/share", async (req, res) => {
  const user = await User.findById(req.params.id);
  user.shares += 1;
  await user.save();
  res.json(user);
});

module.exports = router;
