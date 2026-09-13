"use strict";
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const multer = require("multer");
const mongoose = require("mongoose");

const uploadsDir = path.join(__dirname, "../uploads");
const envPath = path.join(__dirname, "../.env");
fs.mkdirSync(uploadsDir, { recursive: true });

// Password Complexity Validator: Alphanumeric, min 8 chars, at least 1 symbol
function validatePasswordComplexity(password) {
  if (typeof password !== "string" || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return hasLetter && hasNumber && hasSymbol;
}

/**
 * In-Memory Sliding Window Rate Limiter
 * Provides anti-brute-force and rate-limiting defense with zero external dependencies
 */
class SlidingWindowRateLimiter {
  constructor({ windowMs, maxRequests, message, minIntervalMs = 0 }) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message || "Too many requests. Please try again later.";
    this.minIntervalMs = minIntervalMs;
    this.hits = new Map();
    const timer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    if (timer && timer.unref) timer.unref();
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter((t) => now - t < this.windowMs);
      if (valid.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, valid);
      }
    }
  }

  reset(key) {
    if (key) {
      this.hits.delete(key);
    } else {
      this.hits.clear();
    }
  }

  middleware(keyExtractor = (req) => req.ip || req.socket.remoteAddress || "global") {
    return (req, res, next) => {
      const key = keyExtractor(req);
      const now = Date.now();
      const timestamps = this.hits.get(key) || [];
      const validTimestamps = timestamps.filter((t) => now - t < this.windowMs);

      // Check minInterval cooldown if configured
      if (this.minIntervalMs > 0 && validTimestamps.length > 0) {
        const lastHit = validTimestamps[validTimestamps.length - 1];
        const elapsed = now - lastHit;
        if (elapsed < this.minIntervalMs) {
          const waitSeconds = Math.ceil((this.minIntervalMs - elapsed) / 1000);
          res.setHeader("Retry-After", waitSeconds);
          return res.status(429).json({
            error: `Please wait ${waitSeconds} second${waitSeconds > 1 ? "s" : ""} before requesting another One-Time Password.`,
          });
        }
      }

      if (validTimestamps.length >= this.maxRequests) {
        const oldest = validTimestamps[0];
        const retryAfterSec = Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000));
        res.setHeader("Retry-After", retryAfterSec);
        return res.status(429).json({
          error: `${this.message} (Retry allowed in ${retryAfterSec} seconds).`,
        });
      }

      validTimestamps.push(now);
      this.hits.set(key, validTimestamps);
      next();
    };
  }
}

// Rate Limiter instances
const loginRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  message: "Too many login attempts. Account access temporarily throttled for security.",
});

const otpSendRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5,
  minIntervalMs: 15 * 1000, // 15 seconds cooldown
  message: "Too many One-Time Password dispatch requests. Maximum 5 requests allowed per 5 minutes.",
});

const forgotPasswordRateLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 5,
  minIntervalMs: 15 * 1000, // 15 seconds cooldown
  message: "Too many password recovery requests. Maximum 5 requests allowed per 5 minutes.",
});

// Gmail OTP Dispatch Configuration & Helper
let customGmailConfig = {
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

async function sendOtpEmail(toEmail, otpCode, purpose) {
  // Never dispatch real emails to test addresses or in automated test runs
  if (
    process.env.NODE_ENV === "test" ||
    /@(?:test|example|invalid|localhost|testcorp\.in|hi2\.in)/i.test(toEmail)
  ) {
    console.log(
      `[TEST/DEV DOMAIN] OTP generated for ${toEmail}: ${otpCode} (skipping live SMTP dispatch)`,
    );
    return { sent: true, mode: "test_mode", otp: otpCode };
  }

  const transporter = getEmailTransporter();
  const subject =
    purpose === "registration"
      ? "उद्योग संयोग (Udyog Samyog) - Enterprise Registration OTP"
      : "उद्योग संयोग (Udyog Samyog) - Password Reset OTP";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #1e3a8a; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">🏛️ उद्योग संयोग | Udyog Samyog</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #cbd5e1;">Government of Maharashtra · Single Window Clearance System</p>
      </div>
      <div style="padding: 24px; color: #1e293b; background: #ffffff;">
        <p style="font-size: 16px; margin-bottom: 16px;">Namaskar,</p>
        <p style="font-size: 14px; line-height: 1.5; color: #475569;">
          Your One-Time Password (OTP) for <b>${purpose === "registration" ? "Enterprise Registration" : "Account Password Reset"}</b> on the Maharashtra Single Window Portal is:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${otpCode}</span>
          <p style="font-size: 12px; color: #dc2626; font-weight: bold; margin: 8px 0 0 0;">Valid for 1 minute 30 seconds (90 seconds). Do not share this OTP with anyone.</p>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          This is an automated dispatch from the Directorate of Industries and Maharashtra State Innovation Society.
        </p>
      </div>
      <div style="background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
        © 2026 Udyog Samyog, Government of Maharashtra. All rights reserved.
      </div>
    </div>
  `;

  if (transporter) {
    const fromAddress = customGmailConfig.user || process.env.GMAIL_USER;
    try {
      console.log(
        `[GMAIL SMTP] Dispatching OTP ${otpCode} to ${toEmail} from ${fromAddress}...`,
      );
      const info = await transporter.sendMail({
        from: `"Udyog Samyog - Govt of Maharashtra" <${fromAddress}>`,
        to: toEmail,
        subject,
        html: htmlContent,
      });
      console.log(
        `[GMAIL SMTP SUCCESS] Message delivered to ${toEmail}. MessageId: ${info.messageId}`,
      );
      return {
        sent: true,
        mode: "gmail",
        messageId: info.messageId,
        recipient: toEmail,
      };
    } catch (err) {
      console.error(
        `[GMAIL SMTP FAILED] Failed to send email via Gmail to ${toEmail}:`,
        err.message,
      );
      console.log(
        `[FALLBACK DEV OTP] Using local OTP fallback for ${toEmail}: ${otpCode}`,
      );
      return {
        sent: true,
        mode: "fallback_console",
        otp: otpCode,
        warning: `Live email delivery failed (${err.message}), generated local code.`,
      };
    }
  } else {
    console.log(
      `\n================ [UDYOG SAMYOG OTP DISPATCH] ================\nTo: ${toEmail}\nPurpose: ${purpose}\nOTP: ${otpCode}\n(Gmail credentials not configured in env, logged to console)\n============================================================\n`,
    );
    return { sent: true, mode: "dev_console", otp: otpCode };
  }
}

// Multer Document Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, and PNG files are allowed"));
    }
  },
});

// Authentication Helpers
function auth(req, res, next) {
  if (!req.session.user) {
    return res
      .status(401)
      .json({ error: "Authentication required. Please log in." });
  }
  next();
}

function official(req, res, next) {
  if (!req.session.user || req.session.user.role !== "official") {
    return res
      .status(403)
      .json({ error: "Access restricted to authorized government officials." });
  }
  next();
}

function apexOfficial(req, res, next) {
  if (
    !req.session.user ||
    req.session.user.role !== "official" ||
    !req.session.user.isApex
  ) {
    return res.status(403).json({
      error:
        "Access restricted to Department Officer (State Innovation Society / Industries) - Apex Authority.",
    });
  }
  next();
}

// Regulatory Knowledge & Schemes Recommendation Engine
function evaluateRegulatoryChecklist(data) {
  const land = parseFloat(data.landSize || 0);
  const water = parseFloat(data.waterUse || 0);
  const power = parseFloat(data.electricity || 0);
  const isHazardous = !!data.hazardous;
  const cost = parseFloat(data.projectCost || 0);
  const category = data.industryCategory || "Light Engineering";

  // 1. Determine Enterprise Classification under Micro, Small and Medium Enterprises Development Act 2020
  let msme = "Micro";
  if (cost > 50) msme = "Large";
  else if (cost > 10) msme = "Medium";
  else if (cost > 1) msme = "Small";

  // 2. Risk-Based Scrutiny Category (Green / Orange / Red)
  let riskTier = "Green";
  if (
    isHazardous ||
    category === "Chemicals" ||
    category === "Pharmaceuticals" ||
    land > 20 ||
    water > 100
  ) {
    riskTier = "Red";
  } else if (
    land > 5 ||
    water > 30 ||
    power > 350 ||
    category === "Food Processing" ||
    category === "Textile"
  ) {
    riskTier = "Orange";
  }

  // 3. Clearances Required
  const clearances = [
    {
      name: "Industrial Development Corporation Building Plan & Land Use Approval",
      dept: "Maharashtra Industrial Development Corporation",
      statutoryAct: "Maharashtra Regional and Town Planning Act, 1966",
      status: "In Progress",
      taskDept: "midc",
      docs: [
        "Land Allotment Letter / Title Deed",
        "Site Master Plan & Layout Drawing",
        "Architect Certificate",
      ],
    },
    {
      name: `Pollution Control Board Consent to Establish (${riskTier} Category)`,
      dept: "Maharashtra Pollution Control Board",
      statutoryAct: "Water (Prevention & Control of Pollution) Act 1974 & Air (Prevention & Control of Pollution) Act 1981",
      status: "Under Review",
      taskDept: "mpcb",
      docs: [
        "Water Balance Chart & Effluent Treatment Scheme",
        "Manufacturing Process Flowsheet",
        "Ambient Air & Noise Mitigation Plan",
      ],
    },
    {
      name: "Provisional Fire Safety Clearance Certificate (Directorate of Maharashtra Fire Services)",
      dept: "Maharashtra Fire Services Directorate",
      statutoryAct: "Maharashtra Fire Prevention and Life Safety Measures Act, 2006",
      status: "Under Review",
      taskDept: "fire",
      docs: [
        "Fire Hydrant & Evacuation Layout",
        "Structural Stability Certificate",
      ],
    },
    {
      name: "Factory Registration & Plant Safety Approval (Directorate of Industrial Safety & Health)",
      dept: "Directorate of Industrial Safety & Health",
      statutoryAct: "Factories Act, 1948",
      status: "In Progress",
      taskDept: "dish",
      docs: [
        "Factory Layout Blueprint & Machine Guarding",
        "List of Plant & Machinery with Power Ratings",
      ],
    },
    {
      name:
        power > 500
          ? "High Tension Industrial Power Sanction (State Electricity Distribution)"
          : "Low Tension Industrial Power Sanction (State Electricity Distribution)",
      dept: "Maharashtra State Electricity Distribution Company",
      statutoryAct: "Electricity Act, 2003",
      status: "In Progress",
      taskDept: "msedcl",
      docs: [
        "Connected Load Test Report",
        "Substation Space Allocation Undertaking",
      ],
    },
  ];

  if (isHazardous) {
    clearances.push({
      name: "Hazardous Waste Management Authorization",
      dept: "Maharashtra Pollution Control Board",
      statutoryAct: "Hazardous and Other Wastes Management Rules, 2016",
      status: "Pending",
      taskDept: "mpcb",
      docs: ["Hazardous Waste Manifest & Disposal Agreement with Treatment Facility"],
    });
  }

  if (water > 50) {
    clearances.push({
      name: "Maharashtra Ground Water Authority Water Extraction Clearance Certificate",
      dept: "Water Resources Department, Government of Maharashtra",
      statutoryAct: "Maharashtra Ground Water Development and Management Act",
      status: "Pending",
      taskDept: "wrd",
      docs: ["Hydrogeological Survey Report", "Rainwater Harvesting Design"],
    });
  }

  // 4. Eligible Maharashtra Government Incentive Schemes
  const schemes = [
    {
      title: "Package Scheme of Incentives (2019/2024)",
      dept: "Directorate of Industries, Maharashtra",
      benefits:
        "Up to 40%-80% Capital Subsidy on Fixed Capital Investment, Stamp Duty & Registration Exemption",
      eligibility:
        "Applicable for Micro, Small and Medium Enterprises and Large units established in Maharashtra industrial zones",
    },
    {
      title: "State Innovation Society Startup Innovation Voucher & Seed Grant",
      dept: "Maharashtra State Innovation Society",
      benefits:
        "Up to ₹15 Lakhs financial grant for innovative prototyping and commercialization",
      eligibility:
        "Available for innovative technology and manufacturing startups registered in Maharashtra",
    },
    {
      title: "Industrial Electricity Duty & Green Power Waiver",
      dept: "Energy Department, Government of Maharashtra",
      benefits:
        "100% waiver of Electricity Duty for 7 to 10 years based on taluka categorization",
      eligibility: "New industrial units taking power sanction from State Electricity Distribution Company",
    },
    {
      title: "Interest Subvention on Working Capital",
      dept: "Department of Skills, Employment & Entrepreneurship",
      benefits:
        "5% interest subsidy on bank term loans for advanced machinery modernization",
      eligibility:
        "Micro and Small enterprises with verified Udyam / GSTIN registration",
    },
  ];

  return { msme, riskTier, clearances, schemes };
}

function determinePlanType(docType, explicitType) {
  if (explicitType && ["environmental_plan", "civil_plan", "factory_safety_plan", "fire_safety_plan"].includes(explicitType)) {
    return explicitType;
  }
  const lower = String(docType || "").toLowerCase();
  if (lower.includes("environment") || lower.includes("effluent") || lower.includes("etp") || lower.includes("water balance") || lower.includes("air emission")) {
    return "environmental_plan";
  }
  if (lower.includes("civil") || lower.includes("site master") || lower.includes("building") || lower.includes("midc") || lower.includes("layout")) {
    return "civil_plan";
  }
  if (lower.includes("factory") || lower.includes("dish") || lower.includes("safety plan") || lower.includes("worker") || lower.includes("machinery")) {
    return "factory_safety_plan";
  }
  if (lower.includes("fire") || lower.includes("hydrant") || lower.includes("evacuation") || lower.includes("sprinkler")) {
    return "fire_safety_plan";
  }
  return "supporting_doc";
}

function getDocumentDepartment(doc) {
  if (!doc) return null;
  const planType = doc.plan_type || "";
  if (planType === "supporting_doc") return "general";
  if (planType === "environmental_plan") return "mpcb";
  if (planType === "civil_plan") return "midc";
  if (planType === "factory_safety_plan") return "dish";
  if (planType === "fire_safety_plan") return "fire";

  const lowerType = String(doc.document_type || "").toLowerCase();
  const lowerName = String(doc.original_name || "").toLowerCase();
  const text = `${lowerType} ${lowerName}`;

  if (
    text.includes("supporting") ||
    text.includes("dpr") ||
    text.includes("feasibility") ||
    text.includes("incorporation") ||
    text.includes("title deed") ||
    text.includes("allotment") ||
    text.includes("gstin") ||
    text.includes("pan card") ||
    text.includes("constitutional")
  ) {
    return "general";
  }

  if (
    text.includes("environment") ||
    text.includes("effluent") ||
    text.includes("etp") ||
    text.includes("water balance") ||
    text.includes("air emission") ||
    text.includes("pollution") ||
    text.includes("mpcb") ||
    text.includes("cte")
  ) {
    return "mpcb";
  }
  if (
    text.includes("civil") ||
    text.includes("site") ||
    text.includes("layout") ||
    text.includes("building") ||
    text.includes("midc") ||
    text.includes("fsi") ||
    text.includes("far") ||
    text.includes("setback")
  ) {
    return "midc";
  }
  if (
    text.includes("factory") ||
    text.includes("dish") ||
    text.includes("safety") ||
    text.includes("hazard") ||
    text.includes("machinery") ||
    text.includes("worker") ||
    text.includes("containment")
  ) {
    return "dish";
  }
  if (
    text.includes("fire") ||
    text.includes("hydrant") ||
    text.includes("evacuation") ||
    text.includes("sprinkler") ||
    text.includes("pump")
  ) {
    return "fire";
  }
  return "general";
}

// Convert Mongoose doc or lean object to clean JSON with string `id`
function serialize(doc) {
  if (!doc) return doc;
  if (Array.isArray(doc)) return doc.map(serialize);
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  if (o._id) {
    o.id = o._id.toString();
    delete o._id;
  }
  if (o.user_id && typeof o.user_id === "object" && o.user_id.toString) {
    o.user_id = o.user_id.toString();
  }
  if (o.application_id && typeof o.application_id === "object" && o.application_id.toString) {
    o.application_id = o.application_id.toString();
  }
  if (o.officer_id && typeof o.officer_id === "object" && o.officer_id.toString) {
    o.officer_id = o.officer_id.toString();
  }
  if (o.reply_file_id && typeof o.reply_file_id === "object" && o.reply_file_id.toString) {
    o.reply_file_id = o.reply_file_id.toString();
  }
  delete o.__v;
  return o;
}

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "string" && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

module.exports = {
  uploadsDir,
  envPath,
  validatePasswordComplexity,
  SlidingWindowRateLimiter,
  loginRateLimiter,
  otpSendRateLimiter,
  forgotPasswordRateLimiter,
  customGmailConfig,
  getEmailTransporter,
  sendOtpEmail,
  upload,
  auth,
  official,
  apexOfficial,
  evaluateRegulatoryChecklist,
  determinePlanType,
  getDocumentDepartment,
  serialize,
  toObjectId,
};

