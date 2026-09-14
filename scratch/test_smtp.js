"use strict";
const nodemailer = require("nodemailer");
const fs = require("fs");

// Manually load .env
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
console.log("GMAIL_USER     :", user ? user.substring(0, 5) + "***" : "NOT SET");
console.log("APP_PASS length:", pass ? pass.length : 0, "(expected 16)");
console.log("APP_PASS value :", pass ? "[" + pass + "]" : "EMPTY");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 12000,
});

console.log("\nTesting SMTP connection to Gmail...");
transporter.verify()
  .then(() => {
    console.log("✅ SMTP VERIFY: SUCCESS — Gmail SMTP connected!");
  })
  .catch((err) => {
    console.error("❌ SMTP VERIFY FAILED:", err.message);
    console.error("   Error code    :", err.code);
    console.error("   Response      :", err.response || "(none)");
    console.error("   Command       :", err.command || "(none)");
  });

