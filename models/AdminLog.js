const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
    status: { type: String, enum: ["approved", "rejected"], required: true },
    message: { type: mongoose.Schema.Types.ObjectId, ref: "ChatMessage" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminLog", adminLogSchema);
