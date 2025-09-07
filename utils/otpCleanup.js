const cron = require("node-cron");
const Otp = require("../models/Otp");

// Run every 10 minutes to clear expired OTPs
cron.schedule("*/10 * * * *", async () => {
  try {
    const result = await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} expired OTP(s).`);
    }
  } catch (err) {
    console.error("Failed to clean OTPs:", err.message);
  }
});
