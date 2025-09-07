const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getProfile,
  updateProfile,
  getUserStats,
  getUnreadMessages,
  changePassword,
  requestPasswordOtp,
  resetPasswordWithOtp,
  searchUsers,
  getUserById,
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // match your uploads folder
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({ storage });

// attach upload.single middleware

// User stats & profile
router.get("/me/stats", protect, getUserStats);
router.get("/messages/unread", protect, getUnreadMessages);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, upload.single("photo"), updateProfile);

// Admin-only: fetch another user by ID
router.get("/search", protect, searchUsers); // 🔐 should be protected
router.get("/:id", protect, adminOnly, getUserById);

// Password routes
router.post("/password/change", protect, changePassword);
router.post("/password/request-otp", protect, requestPasswordOtp); // ❌ don’t need protect here
router.post("/password/reset-otp", protect, resetPasswordWithOtp); // ❌ don’t need protect here

// Search users

module.exports = router;
