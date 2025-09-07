const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./User');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

async function seedAdmin() {
  const email = "admin@site.com";
  const password = "Admin123";
  const hashed = await bcrypt.hash(password, 10);

  const existing = await User.findOne({ email });
  if (existing) {
    console.log("Admin already exists");
    process.exit();
  }

  const admin = new User({
    name: "Super Admin",
    email,
    password: hashed,
    role: "admin",
    nationality: "N/A",
    balance: 0
  });

  await admin.save();
  console.log("✅ Admin user created:", email);
  process.exit();
}

seedAdmin();
