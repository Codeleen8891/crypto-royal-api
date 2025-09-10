const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendEmail(to, subject, html) {
  const msg = {
    to,
    from: process.env.EMAIL_USER, // must be verified sender in SendGrid
    subject,
    text: html.replace(/<[^>]+>/g, ""), // fallback plain text
    html, // real HTML
    replyTo: "cryptoroyal2223@gmail.com",
  };

  try {
    await sgMail.send(msg);
    console.log("✅ Email sent to", to);
  } catch (err) {
    console.error("❌ Email failed", err.response?.body || err);
    throw new Error("Email sending failed");
  }
}

module.exports = { sendEmail };
