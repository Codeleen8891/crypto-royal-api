const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  // host: "gmail", // change if using Outlook/Yahoo/etc
  // port: 465, // 465 (secure) or 587 (TLS)
  // secure: true, // true for 465, false for 587
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // your email password or app password
  },
  tls: {
    rejectUnauthorized: false, // for self-signed certs in dev
  },
});

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "Loaded" : "Missing");

module.exports = transporter;
