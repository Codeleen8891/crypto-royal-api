// test/setup.js
delete require.cache[require.resolve("nodemailer")];
// test/setup.js
const dotenv = require("dotenv");
dotenv.config({ path: ".env.test" });

const mongoose = require("mongoose");
const http = require("http");

const app = require("../app");
const { initSocket } = require("../socket");

// 🟢 Import your User model
const User = require("../models/User");

let server;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(process.env.MONGO_URI_TEST);

  // ✅ Initialize a test server with socket.io
  server = http.createServer(app);
  initSocket(server);
}

async function disconnectDB() {
  if (server) {
    server.close();
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

// 🟢 Helper: create a verified dummy user
async function createVerifiedUser(overrides = {}) {
  const defaultUser = {
    name: "Test User",
    email: "testuser@example.com",
    password: "Password123!",
    isVerified: true,
    role: "user",
  };

  const user = new User({ ...defaultUser, ...overrides });
  await user.save();
  return user;
}

module.exports = { connectDB, disconnectDB, createVerifiedUser };
