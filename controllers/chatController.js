const fs = require("fs");
const path = require("path");
const multer = require("multer");
const ChatMessage = require("../models/ChatMessage");
const { getIO } = require("../socket");

const ADMIN_ID = process.env.ADMIN_ID; // must be set to real User _id

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/chat"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 📤 Upload file (image/audio)
exports.uploadMessageFile = [
  upload.single("file"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({ fileUrl }); // ✅ match frontend expectation
  },
];

// 📩 Send message
exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, message, fileUrl, type } = req.body;

    const msg = await ChatMessage.create({
      sender,
      receiver,
      message: message || "",
      fileUrl: fileUrl || "",
      type: type || "text",
      read: false, // ✅ important
    });

    // Push to both sender & receiver sockets
    getIO().to(receiver.toString()).emit("receiveMessage", msg);
    getIO().to(sender.toString()).emit("receiveMessage", msg);

    res.json(msg);
  } catch (err) {
    console.error("❌ sendMessage error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
};

// 📜 Get conversation with a user
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;

    const msgs = await ChatMessage.find({
      $or: [
        { sender: userId, receiver: ADMIN_ID },
        { sender: ADMIN_ID, receiver: userId },
      ],
    })
      .populate("sender", "name photo")
      .populate("receiver", "name photo")
      .sort({ createdAt: 1 });

    res.json(msgs);
  } catch (err) {
    console.error("❌ getMessages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// DELETE /chat/message/:id
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // 👈 from auth middleware

    const msg = await ChatMessage.findById(id);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // 👮 Only sender or admin can delete
    if (msg.sender.toString() !== userId && !req.user.isAdmin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // If it has a file, remove from disk
    if (msg.fileUrl) {
      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        path.basename(msg.fileUrl)
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // 🔹 Soft delete instead of removing
    msg.message = "This message was deleted";
    msg.fileUrl = "";
    msg.type = "deleted";
    await msg.save();

    return res.json({ message: "Message deleted successfully", msg });
  } catch (err) {
    console.error("deleteMessage error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Mark messages as read
exports.markMessagesRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = ADMIN_ID;

    await ChatMessage.updateMany(
      { sender: userId, receiver: adminId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ markMessagesRead error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
};
