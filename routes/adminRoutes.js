const express = require("express");
const {
  getAllUsers,
  getAdminStats,
  getUsersList,
  getMe,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middlewares/authMiddleware");

const router = express.Router();

// 🔐 Always run `protect` before `adminOnly`
router.get("/me", protect, adminOnly, getMe);
router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/users/list", protect, adminOnly, getUsersList);
router.get("/users/all", protect, adminOnly, getAllUsers);

module.exports = router;
