const assert = require("assert");
const request = require("supertest");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const ChatMessage = require("../models/ChatMessage");
const { connectDB, disconnectDB } = require("./setup");

describe("Chat Controller", function () {
  let user, admin, token;

  before(async function () {
    this.timeout(20000);
    await connectDB();
    await User.deleteMany({});
    await ChatMessage.deleteMany({});

    admin = await User.create({
      name: "ChatAdmin",
      email: "chatadmin@test.com",
      password: "123456",
      role: "admin",
      isVerified: true,
    });

    user = await User.create({
      name: "ChatUser",
      email: "chatuser@test.com",
      password: "123456",
      isVerified: true,
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    process.env.ADMIN_ID = admin._id.toString();
  });

  after(async () => {
    await disconnectDB();
  });

  it("should send a message", async () => {
    const res = await request(app)
      .post("/api/chat/send")
      .set("Authorization", `Bearer ${token}`)
      .send({ sender: user._id, receiver: admin._id, message: "Hello" });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, "Hello");
  });

  it("should fetch messages", async () => {
    const res = await request(app)
      .get(`/api/chat/${user._id}`)
      .set("Authorization", `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body));
  });
});
