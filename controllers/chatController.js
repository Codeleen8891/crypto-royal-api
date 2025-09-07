// controllers/chatController.js
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");
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

// 🗑️ Remove user (optional: delete messages too)
// exports.removeUser = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     await User.findByIdAndDelete(userId);
//     await ChatMessage.deleteMany({
//       $or: [{ sender: userId }, { receiver: userId }],
//     });

//     getIO().to(userId).emit("removed");
//     res.json({ success: true });
//   } catch (err) {
//     console.error("❌ removeUser error:", err);
//     res.status(500).json({ error: "Failed to remove user" });
//   }
// };

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
