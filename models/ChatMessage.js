// models/ChatMessage.js
const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    type: {
      type: String,
      enum: ["text", "image", "audio", "video", "emoji"],
      default: "text",
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema);
