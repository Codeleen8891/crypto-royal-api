// socket.js
const { Server } = require("socket.io");
const ChatMessage = require("./models/ChatMessage");

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: "*", // adjust in production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // User/admin joins their own room by ID
    socket.on("join", (userId) => {
      socket.join(userId.toString());
      console.log(`🔗 User ${userId} joined room`);
    });

    // Handle sending messages
    socket.on("sendMessage", async (msg) => {
      console.log("📩 Message:", msg);

      try {
        // Save with correct schema fields
        const newMsg = new ChatMessage({
          sender: msg.sender,
          receiver: msg.receiver,
          message: msg.message || "",
          fileUrl: msg.fileUrl || null,
          type: msg.type || "text",
          read: false,
        });

        await newMsg.save();

        // Send to both participants
        io.to(msg.receiver.toString()).emit("receiveMessage", newMsg);
        io.to(msg.sender.toString()).emit("receiveMessage", newMsg);
      } catch (error) {
        console.error("❌ Error saving message:", error);
        socket.emit("errorMessage", { error: "Failed to send message" });
      }
    });

    socket.on("removeUser", (userId) => {
      console.log("❌ Remove user:", userId);
      io.to(userId.toString()).emit("removed");
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error(
      "❌ Socket.io not initialized! Call initSocket(server) first."
    );
  }
  return io;
}

module.exports = { initSocket, getIO };
