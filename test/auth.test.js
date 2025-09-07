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
    console.error("❌ Auth test failed. Response:", res.body);
  }
}

describe("Auth Controller", function () {
  before(async function () {
    this.timeout(20000);
    await connectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Otp.deleteMany({});
  });

  after(async () => {
    await disconnectDB();
  });

  it("should register a user", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
    });

    logOnFail(res);
    assert.strictEqual(res.status, 201);
    assert(res.body.message.includes("OTP sent"));
  });

  it("should verify OTP", async () => {
    const user = await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
    });

    await Otp.create({
      email: user.email,
      otp: "123456",
      expiresAt: Date.now() + 60000,
    });

    const res = await request(app).post("/api/auth/verify-otp").send({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
      otp: "123456",
    });

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("verified"));
  });

  it("should resend OTP", async () => {
    const user = await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
    });

    const res = await request(app)
      .post("/api/auth/resend-otp")
      .send({ email: user.email });

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("New OTP sent"));
  });

  it("should login verified user", async function () {
    this.timeout(10000);

    await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
      isVerified: true,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "normal@test.com",
      password: "123456", // plain text password
    });

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.token);
  });

  it("should send forgot password link", async () => {
    await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
      isVerified: true,
    });

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "normal@test.com" });

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("Password reset link sent"));
  });

  it("should reset password with token", async () => {
    const user = await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: await bcrypt.hash("123456", 10),
      isVerified: true,
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, password: "1234567" }); // plain password

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(res.body.message.includes("successful"));
  });
});
