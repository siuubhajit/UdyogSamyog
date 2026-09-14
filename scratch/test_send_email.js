"use strict";
const nodemailer = require("nodemailer");
const fs = require("fs");

// Load .env
const envLines = fs.readFileSync(".env", "utf-8").split(/\r?\n/);
for (const line of envLines) {
  const t = line.trim();
  if (t && !t.startsWith("#") && t.includes("=")) {
    const [k, ...v] = t.split("=");
    process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  }
}

const user = process.env.GMAIL_USER;
const pass = process.env.GMAIL_APP_PASSWORD;

console.log("Sending test OTP email FROM:", user, "TO:", user);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 12000,
});

const testOtp = "123456";

transporter.sendMail({
  from: `"Udyog Samyog Test" <${user}>`,
  to: user,   // send to yourself as a test
  subject: "Udyog Samyog - Test OTP Email",
  html: `<h2>Test OTP: <b>${testOtp}</b></h2><p>This is a test email from the SMTP diagnostic script. If you receive this, Gmail SMTP delivery is working correctly.</p>`,
}).then((info) => {
  console.log("✅ Email SENT successfully!");
  console.log("   MessageId:", info.messageId);
  console.log("   Response :", info.response);
}).catch((err) => {
  console.error("❌ Email FAILED to send!");
  console.error("   Error   :", err.message);
  console.error("   Code    :", err.code);
  console.error("   Response:", err.response || "(none)");
});

