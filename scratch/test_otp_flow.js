"use strict";
// Simulates exactly what the app does when sending OTP
const nodemailer = require("nodemailer");
const fs = require("fs");

// Load .env exactly as server.js does
const envLines = fs.readFileSync(".env", "utf-8").split(/\r?\n/);
for (const line of envLines) {
  const t = line.trim();
  if (t && !t.startsWith("#") && t.includes("=")) {
    const [k, ...v] = t.split("=");
    const key = k.trim();
    const val = v.join("=").trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// Reproduce the customGmailConfig initialization (from helpers.js)
const customGmailConfig = {
  user: process.env.GMAIL_USER || "",
  pass: process.env.GMAIL_APP_PASSWORD || "",
};

function getEmailTransporter() {
  const user = customGmailConfig.user || process.env.GMAIL_USER;
  const pass = customGmailConfig.pass || process.env.GMAIL_APP_PASSWORD;
  if (user && pass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
    });
  }
  return null;
}

// Reproduce sendOtpEmail
async function sendOtpEmail(toEmail, otpCode, purpose) {
  console.log("\n--- sendOtpEmail diagnostics ---");
  console.log("toEmail       :", toEmail);
  console.log("NODE_ENV      :", process.env.NODE_ENV || "(not set)");

  // Reproduce test-domain bypass
  const testBypass =
    process.env.NODE_ENV === "test" ||
    /@(?:test|example|invalid|localhost|testcorp\.in|hi2\.in)/i.test(toEmail);
  console.log("Test bypass?  :", testBypass);

  if (testBypass) {
    console.log(">>> BYPASSED: OTP will NOT be emailed (test domain or test env)");
    return { sent: true, mode: "test_mode", otp: otpCode };
  }

  const transporter = getEmailTransporter();
  console.log("Transporter?  :", transporter ? "YES" : "NO (credentials missing!)");
  console.log("GMAIL_USER    :", customGmailConfig.user || process.env.GMAIL_USER);

  if (!transporter) {
    console.log(">>> FALLBACK: No transporter, OTP only logged to console");
    return { sent: true, mode: "dev_console", otp: otpCode };
  }

  const fromAddress = customGmailConfig.user || process.env.GMAIL_USER;
  try {
    console.log(`Sending from ${fromAddress} to ${toEmail}...`);
    const info = await transporter.sendMail({
      from: `"Udyog Samyog - Govt of Maharashtra" <${fromAddress}>`,
      to: toEmail,
      subject: "Udyog Samyog - OTP Test",
      html: `<h2>Your OTP: <b>${otpCode}</b></h2><p>Test dispatch from diagnostic script.</p>`,
    });
    console.log("✅ Email sent! MessageId:", info.messageId);
    console.log("   Server response:", info.response);
    return { sent: true, mode: "gmail", messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
    return { sent: true, mode: "fallback_console", otp: otpCode };
  }
}

// ----- Run the test -----
// Change this to the email address you are trying to send OTP to:
const TARGET_EMAIL = process.argv[2] || process.env.GMAIL_USER;

console.log("=".repeat(60));
console.log("Testing OTP dispatch to:", TARGET_EMAIL);
console.log("=".repeat(60));

sendOtpEmail(TARGET_EMAIL, "987654", "registration").then((result) => {
  console.log("\nResult:", JSON.stringify(result, null, 2));
});

