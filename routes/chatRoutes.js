const express = require("express");
const {
  sendMessage,
  getMessages,
  uploadMessageFile,
  markMessagesRead,
  deleteMessage,
} = require("../controllers/chatController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/upload", uploadMessageFile);

// POST /chat/send
router.post("/send", sendMessage);

// GET /chat/:userId
router.get("/:userId", getMessages);

// DELETE /chat/remove/:userId
// router.delete("/remove/:userId", removeUser);

// routes/chatRoutes.js
router.post("/mark-read/:userId", markMessagesRead);

router.delete("/message/:id", protect, deleteMessage);

module.exports = router;
