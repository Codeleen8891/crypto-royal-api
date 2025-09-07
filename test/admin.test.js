const assert = require("assert");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = require("../app");
const User = require("../models/User");
const { connectDB, disconnectDB } = require("./setup");

function logOnFail(res) {
  if (res.status !== 200 && res.status !== 201) {
    console.error("❌ Admin test failed. Response:", res.body);
  }
}

describe("Admin Controller", function () {
  let admin, token;

  before(async function () {
    this.timeout(20000);
    await connectDB();
    await User.deleteMany({});

    admin = await User.create({
      name: "AdminUser",
      email: "adminsearch@test.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
      isVerified: true,
    });
    token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  });

  after(async () => {
    await disconnectDB();
  });

  it("should get admin profile", async () => {
    const res = await request(app)
      .get("/api/admin/me")
      .set("Authorization", `Bearer ${token}`);

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.email, "adminsearch@test.com");
  });

  it("should get all non-admin users", async () => {
    await User.create({
      name: "NormalUser",
      email: "normal@test.com",
      password: "123456",
    });

    const res = await request(app)
      .get("/api/admin/users/list")
      .set("Authorization", `Bearer ${token}`);

    logOnFail(res);
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body));
  });
});
