const assert = require("assert");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const Otp = require("../models/Otp");
const { connectDB, disconnectDB } = require("./setup");

function logOnFail(res) {
  if (res.status !== 200 && res.status !== 201) {
    console.error("❌ User test failed. Response:", res.body);
  }
}

describe("User Controller", function () {
  let user, token;

  before(async function () {
    this.timeout(20000);
    await connectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Otp.deleteMany({});

    user = await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: await bcrypt.hash("123456", 10),
      isVerified: true,
    });

    token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  });

  after(async () => {
    await disconnectDB();
  });

  it("should request password OTP", async () => {
    const res = await request(app)
      .post("/api/users/password/request-otp")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("OTP sent"));
  });

  it("should reset password with OTP", async () => {
    await Otp.create({
      email: user.email,
      otp: "654321",
      expiresAt: Date.now() + 60000,
      password: user.passwor,
    });

    const res = await request(app)
      .post("/api/users/password/reset-otp")
      .set("Authorization", `Bearer ${token}`)
      .send({ otp: "654321", newPassword: "newpass123" });

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("Password reset successful"));
  });

  it("should search users (admin only)", async () => {
    const admin = await User.create({
      name: "AdminUser",
      email: "adminsearch@test.com",
      password: await bcrypt.hash("123456", 10),
      role: "admin",
      isVerified: true,
    });

    const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);

    const res = await request(app)
      .get("/api/users/search?q=Normal")
      .set("Authorization", `Bearer ${adminToken}`);

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body));
  });
});
