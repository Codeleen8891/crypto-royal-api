const express = require("express");
const multer = require("multer");
const path = require("path");
const { protect } = require("../middlewares/authMiddleware");
const {
  register,
  verifyOtp,
  login,
  forgotPassword,
  resetPassword,
  resendOtp,
} = require("../controllers/authController");

const router = express.Router();

// Multer config (disk storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // save files in uploads/
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique file name
  },
});

const upload = multer({ storage });

// Routes
router.post("/register", upload.single("photo"), register);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtp);

module.exports = router;
