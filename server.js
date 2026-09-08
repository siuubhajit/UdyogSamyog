const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { DatabaseSync } = require("node:sqlite");
const multer = require("multer");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// Load environment variables from .env file if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v
          .join("=")
          .trim()
          .replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (e) {
    console.warn("Notice: could not load .env file:", e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure storage directories exist
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// Initialize Database using Node's built-in SQLite engine (Udyog Samyog)
const oldDbPath = path.join(dataDir, "udyog-setu.db");
const newDbPath = path.join(dataDir, "udyog-samyog.db");
if (!fs.existsSync(newDbPath) && fs.existsSync(oldDbPath)) {
  try {
    fs.copyFileSync(oldDbPath, newDbPath);
  } catch (e) {
    console.warn("Database file copy note:", e.message);
  }
}
const db = new DatabaseSync(fs.existsSync(newDbPath) ? newDbPath : oldDbPath);
db.exec("PRAGMA foreign_keys = ON;");

// Create Database Tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  company_name TEXT,
  registration_no TEXT,
  phone TEXT,
  department TEXT,
  contact_person TEXT,
  district TEXT,
  dept_code TEXT,
  is_apex INTEGER DEFAULT 0,
  is_banned INTEGER DEFAULT 0,
  ban_reason TEXT,
  banned_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  purpose TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  application_no TEXT UNIQUE NOT NULL,
  company_name TEXT,
  registration_no TEXT,
  industry_category TEXT,
  land_size REAL,
  water_use REAL,
  electricity REAL,
  hazardous INTEGER DEFAULT 0,
  location TEXT,
  district TEXT,
  project_cost REAL DEFAULT 0,
  employment_potential INTEGER DEFAULT 0,
  msme_category TEXT DEFAULT 'Small',
  risk_tier TEXT DEFAULT 'Green',
  status TEXT DEFAULT 'In Progress',
  clearances_json TEXT,
  parallel_status_json TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  document_type TEXT,
  original_name TEXT,
  stored_name TEXT,
  mime_type TEXT,
  size INTEGER,
  verification_status TEXT DEFAULT 'Pending',
  officer_remarks TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES applications(id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  message TEXT NOT NULL,
  applicant_reply TEXT,
  reply_file_id INTEGER,
  reply_file_name TEXT,
  status TEXT DEFAULT 'Open',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  FOREIGN KEY(application_id) REFERENCES applications(id),
  FOREIGN KEY(officer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inspections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  officer_id INTEGER NOT NULL,
  department TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  inspector_name TEXT,
  status TEXT DEFAULT 'Scheduled',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(application_id) REFERENCES applications(id),
  FOREIGN KEY(officer_id) REFERENCES users(id)
);
`);

// Safe migrations for preexisting databases
try {
  db.exec("ALTER TABLE users ADD COLUMN dept_code TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN is_apex INTEGER DEFAULT 0;");
} catch (_) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0;");
} catch (_) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN ban_reason TEXT;");
} catch (_) {}
try {
  db.exec("ALTER TABLE users ADD COLUMN banned_at TEXT;");
} catch (_) {}
// Sequential pipeline columns
try {
  db.exec("ALTER TABLE applications ADD COLUMN current_stage TEXT DEFAULT 'mpcb';");
} catch (_) {}
try {
  db.exec("ALTER TABLE applications ADD COLUMN stage_statuses TEXT DEFAULT '{}';");
} catch (_) {}

// Seed Default Accounts & Sample Demo Data for Maharashtra State Innovation Society & Departments
function seedInitialData() {
  // Password policy: Alphanumeric, min 8 chars, at least 1 symbol
  const hashApex = bcrypt.hashSync("Officer@123#", 10);
  const hashMidc = bcrypt.hashSync("Midc@123#", 10);
  const hashMpcb = bcrypt.hashSync("Mpcb@123#", 10);
  const hashFire = bcrypt.hashSync("Fire@123#", 10);
  const hashDish = bcrypt.hashSync("Dish@123#", 10);
  const hashApplicant = bcrypt.hashSync("Applicant@123#", 10);

  const officialSeeds = [
    {
      email: "officer@udyog.gov.in",
      role: "official",
      hash: hashApex,
      company: "Maharashtra State Innovation Society",
      dept: "Industries Department & MSInS (Apex Authority)",
      person: "Shri R. K. Patil (Single Window Apex Officer)",
      district: "Mumbai City",
      phone: "022-22025112",
      dept_code: "msins",
      is_apex: 1,
    },
    {
      email: "midc.officer@udyog.gov.in",
      role: "official",
      hash: hashMidc,
      company: "Maharashtra Industrial Development Corporation (MIDC)",
      dept: "MIDC Civil & Infrastructure",
      person: "Er. Nilesh T. Kadam (Executive Engineer - Civil)",
      district: "Pune",
      phone: "020-25501234",
      dept_code: "midc",
      is_apex: 0,
    },
    {
      email: "mpcb.officer@udyog.gov.in",
      role: "official",
      hash: hashMpcb,
      company: "Maharashtra Pollution Control Board (MPCB)",
      dept: "MPCB (Environmental)",
      person: "Dr. S. M. Deshmukh (Sub-Regional Officer - Environmental)",
      district: "Pune",
      phone: "020-25811627",
      dept_code: "mpcb",
      is_apex: 0,
    },
    {
      email: "fire.officer@udyog.gov.in",
      role: "official",
      hash: hashFire,
      company: "Directorate of Maharashtra Fire Services",
      dept: "Maharashtra Fire Services",
      person: "Chief Fire Officer S. V. More",
      district: "Pune",
      phone: "020-26451101",
      dept_code: "fire",
      is_apex: 0,
    },
    {
      email: "dish.officer@udyog.gov.in",
      role: "official",
      hash: hashDish,
      company: "Directorate of Industrial Safety & Health (DISH)",
      dept: "DISH (Factory Safety)",
      person: "Er. V. A. Shinde (Joint Director of Industrial Safety)",
      district: "Pune",
      phone: "020-24458899",
      dept_code: "dish",
      is_apex: 0,
    },
  ];

  for (const u of officialSeeds) {
    const existing = db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(u.email);
    if (!existing) {
      db.prepare(
        `
        INSERT INTO users(role, email, password_hash, company_name, department, contact_person, district, phone, dept_code, is_apex, is_banned)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `,
      ).run(
        u.role,
        u.email,
        u.hash,
        u.company,
        u.dept,
        u.person,
        u.district,
        u.phone,
        u.dept_code,
        u.is_apex,
      );
    } else {
      db.prepare(
        `
        UPDATE users
        SET password_hash=?, company_name=?, department=?, contact_person=?, district=?, phone=?, dept_code=?, is_apex=?
        WHERE id=?
      `,
      ).run(
        u.hash,
        u.company,
        u.dept,
        u.person,
        u.district,
        u.phone,
        u.dept_code,
        u.is_apex,
        existing.id,
      );
    }
  }

  // Demo Applicant: Enterprise User
  let applicantId;
  const existingAppUser = db
    .prepare("SELECT id FROM users WHERE email=?")
    .get("entrepreneur@mahindra-auto.in");
  if (!existingAppUser) {
    const info = db
      .prepare(
        `
      INSERT INTO users(role, email, password_hash, company_name, registration_no, contact_person, district, phone, dept_code, is_apex, is_banned)
      VALUES('applicant', 'entrepreneur@mahindra-auto.in', ?, 'Sahyadri Precision Engineering Pvt Ltd', '27AABCS1429B1Z8', 'Anand K. Kulkarni', 'Pune', '+91 98230 45890', NULL, 0, 0)
    `,
      )
      .run(hashApplicant);
    applicantId = info.lastInsertRowid;
  } else {
    applicantId = existingAppUser.id;
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(
      hashApplicant,
      applicantId,
    );
  }

  // Sample Application for Demonstration
  const appCount = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;
  if (appCount === 0 && applicantId) {
    const defaultClearances = JSON.stringify([
      {
        name: "MIDC Land Allotment & Building Plan",
        dept: "MIDC",
        status: "Approved",
        taskDept: "midc",
      },
      {
        name: "Consent to Establish (CTE - Orange)",
        dept: "MPCB",
        status: "Under Review",
        taskDept: "mpcb",
      },
      {
        name: "Provisional Fire NOC",
        dept: "Maharashtra Fire Services",
        status: "Under Review",
        taskDept: "fire",
      },
      {
        name: "Factory License & Safety Approval",
        dept: "Directorate of Industrial Safety & Health (DISH)",
        status: "In Progress",
        taskDept: "dish",
      },
      {
        name: "High Tension (HT) Power Sanction",
        dept: "MSEDCL",
        status: "Approved",
        taskDept: "msedcl",
      },
    ]);

    const parallelStatus = JSON.stringify({
      midc: {
        name: "MIDC Civil & Infrastructure",
        clearance: "MIDC Land Allotment & Building Plan",
        status: "Approved",
        remarks:
          "Plot No. B-42 Chakan MIDC Phase II validated. Building construction blueprints cleared.",
        officer: "Er. Nilesh T. Kadam",
        updated: new Date().toISOString(),
      },
      mpcb: {
        name: "MPCB (Environmental)",
        clearance: "Consent to Establish (CTE - Orange)",
        status: "Under Review",
        remarks:
          "Water conservation scheme & effluent treatment plan under verification.",
        officer: "Dr. S. M. Deshmukh",
        updated: new Date().toISOString(),
      },
      fire: {
        name: "Maharashtra Fire Services",
        clearance: "Provisional Fire NOC",
        status: "Under Review",
        remarks: "Hydrant network and fire tender turning radius verified.",
        officer: "Chief Fire Officer S. V. More",
        updated: new Date().toISOString(),
      },
      dish: {
        name: "DISH (Factory Safety)",
        clearance: "Factory License & Safety Approval",
        status: "In Progress",
        remarks:
          "Machine guarding layouts & emergency egress pathways under scrutiny.",
        officer: "Er. V. A. Shinde",
        updated: new Date().toISOString(),
      },
      msedcl: {
        name: "MSEDCL Power Sanction",
        clearance: "HT Power Sanction (450 kVA)",
        status: "Approved",
        remarks: "Load demand 450 kVA sanctioned at 11 kV feeder.",
        officer: "Superintending Engineer",
        updated: new Date().toISOString(),
      },
    });

    const seedStageStatuses = JSON.stringify({
      mpcb: {
        decision: "Approved",
        remarks: "Environmental Impact Assessment cleared. Effluent Treatment Plan verified. CTE (Consent to Establish) granted under Orange Category.",
        officer: "Dr. S. M. Deshmukh",
        decided_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    });

    const info1 = db
      .prepare(
        `
      INSERT INTO applications (
        user_id, application_no, company_name, registration_no, industry_category,
        land_size, water_use, electricity, hazardous, location, district,
        project_cost, employment_potential, msme_category, risk_tier, status,
        clearances_json, parallel_status_json, current_stage, stage_statuses, created_at
      ) VALUES (
        ?, 'MH/MSInS/2026/00142', 'Sahyadri Precision Engineering Pvt Ltd', '27AABCS1429B1Z8', 'Light Engineering',
        3.5, 25.0, 450.0, 0, 'Plot B-42, Chakan Industrial Area Phase II, Khed', 'Pune',
        14.5, 120, 'Small', 'Orange', 'In Progress', ?, ?, 'midc', ?, datetime('now', '-3 days')
      )
    `,
      )
      .run(applicantId, defaultClearances, parallelStatus, seedStageStatuses);

    const appId1 = info1.lastInsertRowid;

    // Create sample PDF in uploads
    const sampleFilename = `sample_site_plan_${Date.now()}.pdf`;
    const sampleFilePath = path.join(uploadsDir, sampleFilename);
    const dummyPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj\n4 0 obj<</Length 186>>stream\nBT\n/F1 18 Tf\n70 700 Td\n(GOVERNMENT OF MAHARASHTRA - UDYOG SAMYOG) Tj\n0 -30 Td\n(APPLICANT: Sahyadri Precision Engineering Pvt Ltd) Tj\n0 -25 Td\n(DOCUMENT: Industrial Site Master Layout Plan - Plot B42 Chakan) Tj\n0 -25 Td\n(STATUS: Digitally Submitted for Single Window Clearance) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000214 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n450\n%%EOF`;
    fs.writeFileSync(sampleFilePath, dummyPdfContent);

    db.prepare(
      `
      INSERT INTO documents (application_id, user_id, document_type, original_name, stored_name, mime_type, size, verification_status, officer_remarks)
      VALUES (?, ?, 'Site Layout Plan', 'Chakan_Industrial_Site_Plan_Rev2.pdf', ?, 'application/pdf', ?, 'Verified', 'Meets setback standards and MIDC roadway alignment')
    `,
    ).run(appId1, applicantId, sampleFilename, dummyPdfContent.length);

    // Add query and scheduled inspection
    const officerRow = db
      .prepare("SELECT id FROM users WHERE email='officer@udyog.gov.in'")
      .get();
    if (officerRow) {
      db.prepare(
        `
        INSERT INTO queries (application_id, officer_id, message, applicant_reply, status, created_at, resolved_at)
        VALUES (?, ?, 'Please specify the exact designated hazardous waste storage shed coordinates according to MPCB Schedule II.', 'Updated the layout blueprint with marked secondary containment and certified storage shed.', 'Resolved', datetime('now', '-2 days'), datetime('now', '-1 day'))
      `,
      ).run(appId1, officerRow.id);

      db.prepare(
        `
        INSERT INTO inspections (application_id, officer_id, department, scheduled_date, inspector_name, status, notes)
        VALUES (?, ?, 'Directorate of Industrial Safety & Health (DISH)', date('now', '+3 days'), 'Er. V. A. Shinde (Joint Director of Safety)', 'Scheduled', 'Combined joint inspection with Fire Services for machine guarding and egress clearance.')
      `,
      ).run(appId1, officerRow.id);
    }
  }
}

seedInitialData();

// Middleware setup
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "udyog-samyog-maharashtra-secret-key-2026",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 12 * 60 * 60 * 1000,
    },
  }),
);

app.use(express.static(path.join(__dirname, "public")));

// Password Complexity Validator: Alphanumeric, min 8 chars, at least 1 symbol
function validatePasswordComplexity(password) {
  if (typeof password !== "string" || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);
  return hasLetter && hasNumber && hasSymbol;
}

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
    });
  }
  return null;
}

async function sendOtpEmail(toEmail, otpCode, purpose) {
  // Never dispatch real emails to test addresses in automated test runs
  if (process.env.NODE_ENV === "test") {
    console.log(
      `[TEST MODE] OTP generated for ${toEmail}: ${otpCode} (skipping live SMTP dispatch)`,
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
          This is an automated dispatch from the Directorate of Industries and Maharashtra State Innovation Society (MSInS).
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
      return { sent: false, mode: "fallback", error: err.message };
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
        "Access restricted to Department Officer (MSInS / Industries) - Apex Authority.",
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

  // 1. Determine MSME Classification under MSMED Act 2020
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
      name: "MIDC / Local Body Land Use & Building Plan Approval",
      dept: "MIDC / Directorate of Town Planning",
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
      name: `MPCB Consent to Establish (CTE - ${riskTier} Category)`,
      dept: "Maharashtra Pollution Control Board (MPCB)",
      statutoryAct: "Water (P&CP) Act 1974 & Air (P&CP) Act 1981",
      status: "Under Review",
      taskDept: "mpcb",
      docs: [
        "Water Balance Chart & Effluent Treatment Scheme",
        "Manufacturing Process Flowsheet",
        "Ambient Air & Noise Mitigation Plan",
      ],
    },
    {
      name: "Provisional Fire Safety No-Objection Certificate (NOC)",
      dept: "Maharashtra Fire Services",
      statutoryAct: "Maharashtra Fire Prevention and Life Safety Measures Act",
      status: "Under Review",
      taskDept: "fire",
      docs: [
        "Fire Hydrant & Evacuation Layout",
        "Structural Stability Certificate",
      ],
    },
    {
      name: "Factory Registration & Machinery Layout Approval",
      dept: "Directorate of Industrial Safety and Health (DISH)",
      statutoryAct: "Factories Act, 1948",
      status: "In Progress",
      taskDept: "dish",
      docs: [
        "Factory Layout Blueprint",
        "List of Plant & Machinery with Power Ratings",
      ],
    },
    {
      name:
        power > 500
          ? "High Tension (HT) Industrial Power Sanction"
          : "Low Tension (LT) Industrial Power Sanction",
      dept: "MSEDCL (Mahavitaran)",
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
      name: "Hazardous Waste Authorization (HWA)",
      dept: "Maharashtra Pollution Control Board",
      statutoryAct: "Hazardous and Other Wastes Management Rules, 2016",
      status: "Pending",
      taskDept: "mpcb",
      docs: ["Hazardous Waste Manifest & Disposal Agreement with MEPL/CHWTSDF"],
    });
  }

  if (water > 50) {
    clearances.push({
      name: "Maharashtra Ground Water Authority (MGWA) Water Extraction NOC",
      dept: "Water Resources Department, GoM",
      statutoryAct: "Maharashtra Ground Water Development and Management Act",
      status: "Pending",
      taskDept: "wrd",
      docs: ["Hydrogeological Survey Report", "Rainwater Harvesting Design"],
    });
  }

  // 4. Eligible Maharashtra Government Incentive Schemes
  const schemes = [
    {
      title: "Package Scheme of Incentives (PSI - 2019/2024)",
      dept: "Directorate of Industries, Maharashtra",
      benefits:
        "Up to 40%-80% Capital Subsidy on Fixed Capital Investment, Stamp Duty & Registration Exemption",
      eligibility:
        "Applicable for MSMEs and Large units established in Maharashtra industrial zones",
    },
    {
      title: "MSInS Startup Innovation Voucher & Seed Grant",
      dept: "Maharashtra State Innovation Society (MSInS)",
      benefits:
        "Up to ₹15 Lakhs financial grant for innovative prototyping and commercialization",
      eligibility:
        "Available for innovative technology and manufacturing startups registered in Maharashtra",
    },
    {
      title: "Industrial Electricity Duty & Green Power Waiver",
      dept: "Energy Department, Govt of Maharashtra",
      benefits:
        "100% waiver of Electricity Duty for 7 to 10 years based on taluka categorization",
      eligibility: "New industrial units taking power sanction from MSEDCL",
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

// ==========================================
// AUTHENTICATION & OTP ROUTES
// ==========================================
// AUTHENTICATION & OTP ROUTES
// ==========================================

const OTP_EXPIRY_MS = 90 * 1000; // 1 minute 30 seconds (90 seconds)

// Send OTP via Gmail or Dev Fallback
app.post("/api/otp/send", async (req, res) => {
  try {
    const { email, purpose } = req.body;
    if (!email || !purpose) {
      return res.status(400).json({ error: "Email and purpose are required." });
    }
    const emailNorm = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      return res
        .status(400)
        .json({ error: "Please enter a valid email address." });
    }

    if (purpose === "registration") {
      const existing = db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(emailNorm);
      if (existing) {
        return res.status(400).json({
          error: `An enterprise account is already registered with email '${emailNorm}'. Please sign in or use a different email address.`,
        });
      }
    } else if (purpose === "reset") {
      const existing = db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(emailNorm);
      if (!existing) {
        return res.status(404).json({
          error: "No account registered with this email address.",
        });
      }
    }

    // Invalidate any previous unused OTP for this email and purpose to support fresh resends cleanly
    db.prepare(
      "UPDATE otps SET used=1 WHERE email=? AND purpose=? AND used=0",
    ).run(emailNorm, purpose);

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const dispatchResult = await sendOtpEmail(emailNorm, otp, purpose);

    if (dispatchResult.sent === false) {
      return res.status(500).json({
        error: `Failed to deliver email via Gmail to ${emailNorm}: ${dispatchResult.error || "SMTP delivery failed"}. Please verify your Gmail SMTP Settings or recipient email address.`,
      });
    }

    const expiresAt = Date.now() + OTP_EXPIRY_MS; // 90 seconds (1 min 30 sec) from actual delivery

    db.prepare(
      `
      INSERT INTO otps (email, otp, purpose, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    ).run(emailNorm, otp, purpose, expiresAt);

    console.log(
      `[/api/otp/send] Successfully issued OTP for ${emailNorm} (mode: ${dispatchResult.mode}, expires in 90s)`,
    );

    res.json({
      ok: true,
      recipient: emailNorm,
      message:
        dispatchResult.mode === "gmail"
          ? `Verification OTP sent to ${emailNorm} via Gmail (Valid for 1 min 30 sec). Check your Inbox and Spam folder.`
          : `Verification OTP generated. (Dev Mode: ${otp})`,
      devOtp: dispatchResult.mode === "gmail" ? undefined : otp,
      mode: dispatchResult.mode,
      expiresInSeconds: 90,
    });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to dispatch OTP: " + err.message });
  }
});

// Verify OTP
app.post("/api/otp/verify", (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    if (!email || !otp || !purpose) {
      return res
        .status(400)
        .json({ error: "Email, OTP code, and purpose are required." });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const otpNorm = String(otp).trim();

    const record = db
      .prepare(
        `
      SELECT * FROM otps
      WHERE email=? AND otp=? AND purpose=? AND used=0 AND expires_at > ?
      ORDER BY id DESC LIMIT 1
    `,
      )
      .get(emailNorm, otpNorm, purpose, Date.now());

    if (!record) {
      // Check if code was matched but expired
      const expiredRecord = db
        .prepare(
          `
        SELECT * FROM otps
        WHERE email=? AND otp=? AND purpose=? AND used=0 AND expires_at <= ?
        ORDER BY id DESC LIMIT 1
      `,
        )
        .get(emailNorm, otpNorm, purpose, Date.now());

      if (expiredRecord) {
        return res.status(400).json({
          error:
            "This OTP code has expired (validity is 1 minute 30 seconds). Please click 'Resend OTP' to receive a fresh code.",
        });
      }

      // Check if the OTP was issued for a different email address (e.g. sender email)
      const sentElsewhere = db
        .prepare(
          `
        SELECT email FROM otps
        WHERE otp=? AND purpose=? AND expires_at > ?
        ORDER BY id DESC LIMIT 1
      `,
        )
        .get(otpNorm, purpose, Date.now());

      if (sentElsewhere && sentElsewhere.email !== emailNorm) {
        return res.status(400).json({
          error: `The OTP entered was issued for '${sentElsewhere.email}', not '${emailNorm}'. Please click 'Send OTP' to receive a fresh code at '${emailNorm}'.`,
        });
      }

      return res.status(400).json({
        error: `Invalid OTP code for '${emailNorm}'. Please enter the correct 6-digit code or click 'Resend OTP'.`,
      });
    }

    db.prepare("UPDATE otps SET used=1 WHERE id=?").run(record.id);

    if (!req.session.verifiedOtps) req.session.verifiedOtps = {};
    req.session.verifiedOtps[`${purpose}_${emailNorm}`] = Date.now();

    res.json({
      ok: true,
      verified: true,
      message: "OTP successfully verified.",
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "OTP verification failed." });
  }
});

// Gmail Configuration Runtime Endpoint (Publicly accessible from login modal)
app.get("/api/config/gmail", (req, res) => {
  const activeUser = customGmailConfig.user || process.env.GMAIL_USER;
  res.json({
    isConfigured: !!(
      activeUser &&
      (customGmailConfig.pass || process.env.GMAIL_APP_PASSWORD)
    ),
    user: activeUser ? `${activeUser.substring(0, 3)}***@gmail.com` : null,
  });
});

app.post("/api/config/gmail", (req, res) => {
  const { user, appPassword } = req.body;
  if (user && appPassword) {
    const cleanUser = String(user).trim().toLowerCase();
    const cleanPass = String(appPassword).trim().replace(/\s+/g, "");

    customGmailConfig.user = cleanUser;
    customGmailConfig.pass = cleanPass;
    process.env.GMAIL_USER = cleanUser;
    process.env.GMAIL_APP_PASSWORD = cleanPass;

    // Persist to .env file for persistence across restarts
    try {
      let envContent = "";
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, "utf-8");
        if (/GMAIL_USER=/i.test(envContent)) {
          envContent = envContent.replace(
            /GMAIL_USER=.*(\r?\n)?/i,
            `GMAIL_USER=${cleanUser}\n`,
          );
        } else {
          envContent += `\nGMAIL_USER=${cleanUser}`;
        }
        if (/GMAIL_APP_PASSWORD=/i.test(envContent)) {
          envContent = envContent.replace(
            /GMAIL_APP_PASSWORD=.*(\r?\n)?/i,
            `GMAIL_APP_PASSWORD=${cleanPass}\n`,
          );
        } else {
          envContent += `\nGMAIL_APP_PASSWORD=${cleanPass}`;
        }
      } else {
        envContent = `GMAIL_USER=${cleanUser}\nGMAIL_APP_PASSWORD=${cleanPass}\n`;
      }
      fs.writeFileSync(envPath, envContent.trim() + "\n", "utf-8");
    } catch (e) {
      console.warn("Notice: could not persist to .env:", e.message);
    }

    res.json({
      ok: true,
      message: `Gmail SMTP activated for ${cleanUser}! Live OTP emails will now be sent.`,
    });
  } else {
    res.status(400).json({
      error: "Both Gmail address and 16-character App Password are required.",
    });
  }
});

// Test Gmail SMTP Connection
app.post("/api/config/gmail/test", async (req, res) => {
  const user = customGmailConfig.user || process.env.GMAIL_USER;
  const pass = customGmailConfig.pass || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res
      .status(400)
      .json({ error: "Gmail credentials are not configured yet." });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
    await transporter.verify();
    res.json({
      ok: true,
      message: `✓ Connected to Gmail SMTP successfully as ${user}! Live OTP dispatch is ready.`,
    });
  } catch (err) {
    console.error("Gmail verification error:", err);
    res.status(500).json({
      error: `Gmail Connection Failed: ${err.message}. Please verify your Google App Password.`,
    });
  }
});

// Register Enterprise with Confirm Password, Complexity & OTP
app.post("/api/register", async (req, res) => {
  try {
    const {
      companyName,
      registrationNo,
      email,
      phone,
      password,
      confirmPassword,
      district,
      sector,
      contactPerson,
      otp,
    } = req.body;

    if (!companyName || !registrationNo || !email || !password || !phone) {
      return res.status(400).json({
        error:
          "Company Name, GSTIN, Official Email, Mobile Phone Number, and Password are all mandatory.",
      });
    }

    // 1. Phone number validation (Mandatory 10-digit Indian mobile number)
    const rawPhone = String(phone).trim();
    const cleanPhone = rawPhone.replace(/\D/g, "").slice(-10);
    if (
      !cleanPhone ||
      cleanPhone.length !== 10 ||
      !/^[6-9]\d{9}$/.test(cleanPhone)
    ) {
      return res.status(400).json({
        error:
          "Please enter a valid 10-digit Indian mobile number (e.g. 9820012345) starting with 6, 7, 8, or 9.",
      });
    }

    // 2. Already registered phone number check (duplicate phone numbers not allowed)
    const existingPhone = db
      .prepare(
        `
      SELECT id, company_name FROM users
      WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+91', ''), '+', '') LIKE ?
    `,
      )
      .get(rawPhone, `%${cleanPhone}`);

    if (existingPhone) {
      return res.status(400).json({
        error: `This mobile phone number (${cleanPhone}) is already registered with '${existingPhone.company_name}'. Duplicate phone numbers cannot be registered.`,
      });
    }

    // 3. Email normalization and already registered email check
    const emailNorm = String(email).trim().toLowerCase();
    const existingEmail = db
      .prepare("SELECT id FROM users WHERE email=?")
      .get(emailNorm);
    if (existingEmail) {
      return res.status(400).json({
        error: `An enterprise account is already registered with email '${emailNorm}'. Please sign in or use a different email.`,
      });
    }

    // 4. GSTIN validation: 15 to 16 characters (standard Indian GSTIN is 15 chars), capital letters and numbers only, mix required
    const gstinNorm = String(registrationNo).trim().toUpperCase();
    if (gstinNorm.length < 15 || gstinNorm.length > 16) {
      return res.status(400).json({
        error: `GSTIN must be 15 to 16 characters in length (you entered ${gstinNorm.length} characters). Standard Indian GSTIN is 15 characters.`,
      });
    }
    if (!/^[A-Z0-9]{15,16}$/.test(gstinNorm)) {
      return res.status(400).json({
        error:
          "GSTIN must contain only capital letters (A-Z) and numbers (0-9). Lowercase letters and special characters are not allowed.",
      });
    }
    const hasLetters = /[A-Z]/.test(gstinNorm);
    const hasDigits = /\d/.test(gstinNorm);
    if (!hasLetters || !hasDigits) {
      return res.status(400).json({
        error:
          "GSTIN must be a mix of letters and numbers (both capital letters and digits are required).",
      });
    }

    // Already registered GSTIN check
    const existingGstin = db
      .prepare("SELECT id, company_name FROM users WHERE registration_no = ?")
      .get(gstinNorm);
    if (existingGstin) {
      return res.status(400).json({
        error: `This GSTIN / Registration number (${gstinNorm}) is already registered with '${existingGstin.company_name}'.`,
      });
    }

    // 5. Confirm password check
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        error: "Password and Confirm Password do not match.",
      });
    }

    // 6. Complexity check: alphanumeric, min 8 chars, at least 1 symbol
    if (!validatePasswordComplexity(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long, alphanumeric, and contain at least one special symbol (@, #, $, etc.).",
      });
    }

    // 7. Check OTP verification - MUST be verified in session or valid matching unexpired OTP code (90s limit)
    const isSessionVerified =
      req.session.verifiedOtps &&
      req.session.verifiedOtps[`registration_${emailNorm}`];

    if (!isSessionVerified) {
      if (!otp || !String(otp).trim()) {
        return res.status(400).json({
          error:
            "Email verification is mandatory. Please click 'Send OTP' and enter the 6-digit verification code sent to your email.",
        });
      }

      const record = db
        .prepare(
          `
        SELECT * FROM otps
        WHERE email=? AND otp=? AND purpose='registration' AND expires_at > ?
        ORDER BY id DESC LIMIT 1
      `,
        )
        .get(emailNorm, String(otp).trim(), Date.now());

      if (!record) {
        const expired = db
          .prepare(
            `
          SELECT * FROM otps
          WHERE email=? AND otp=? AND purpose='registration' AND expires_at <= ?
          ORDER BY id DESC LIMIT 1
        `,
          )
          .get(emailNorm, String(otp).trim(), Date.now());

        if (expired) {
          return res.status(400).json({
            error:
              "Registration OTP has expired (validity is 1 minute 30 seconds). Please click 'Resend OTP' to receive a fresh code.",
          });
        }

        // Check if OTP was sent to another email address (e.g. sender self-mail)
        const sentElsewhere = db
          .prepare(
            `
          SELECT email FROM otps
          WHERE otp=? AND purpose='registration' AND expires_at > ?
          ORDER BY id DESC LIMIT 1
        `,
          )
          .get(String(otp).trim(), Date.now());

        if (sentElsewhere && sentElsewhere.email !== emailNorm) {
          return res.status(400).json({
            error: `The OTP code entered was issued for '${sentElsewhere.email}', not '${emailNorm}'. Please click 'Send OTP' to receive a fresh code at '${emailNorm}'.`,
          });
        }

        return res.status(400).json({
          error: `Invalid registration OTP code for '${emailNorm}'. Please click 'Send OTP' to receive a valid 6-digit code on this email address.`,
        });
      }

      db.prepare("UPDATE otps SET used=1 WHERE id=?").run(record.id);
    }

    const hash = await bcrypt.hash(password, 10);
    const info = db
      .prepare(
        `
      INSERT INTO users (role, email, password_hash, company_name, registration_no, phone, district, department, contact_person, dept_code, is_apex, is_banned)
      VALUES ('applicant', ?, ?, ?, ?, ?, ?, ?, ?, NULL, 0, 0)
    `,
      )
      .run(
        emailNorm,
        hash,
        companyName.trim(),
        gstinNorm,
        cleanPhone,
        district || "Pune",
        sector || "General Manufacturing",
        contactPerson || "",
      );

    if (req.session.verifiedOtps) {
      delete req.session.verifiedOtps[`registration_${emailNorm}`];
    }

    res.json({
      ok: true,
      id: info.lastInsertRowid,
      message: "Enterprise registered successfully on Udyog Samyog.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res
      .status(500)
      .json({ error: "Registration failed. Please verify input fields." });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(emailNorm);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res
        .status(401)
        .json({ error: "Invalid email address or password." });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Account role mismatch. You are registered as an ${user.role}. Please select the correct tab.`,
      });
    }

    req.session.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      companyName: user.company_name,
      department:
        user.department ||
        (user.role === "official" ? "Government of Maharashtra" : "Enterprise"),
      contactPerson: user.contact_person,
      district: user.district,
      phone: user.phone,
      registrationNo: user.registration_no,
      deptCode: user.dept_code || (user.role === "official" ? "msins" : null),
      isApex: user.is_apex === 1,
      isBanned: user.is_banned === 1,
      banReason: user.ban_reason || "",
    };

    res.json({ ok: true, user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login service encountered an issue." });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post("/api/forgot-password", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const u = db.prepare("SELECT id FROM users WHERE email=?").get(email);
    if (!u) {
      return res.json({
        ok: true,
        message:
          "If registered, a secure verification OTP has been dispatched to your email.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO reset_tokens(user_id, token, expires_at) VALUES(?, ?, ?)",
    ).run(u.id, token, Date.now() + 30 * 60 * 1000);

    // Also dispatch OTP for email flow
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    db.prepare(
      `
      INSERT INTO otps (email, otp, purpose, expires_at)
      VALUES (?, ?, 'reset', ?)
    `,
    ).run(email, otp, Date.now() + 15 * 60 * 1000);

    const dispatch = await sendOtpEmail(email, otp, "reset");

    res.json({
      ok: true,
      message:
        dispatch.mode === "gmail"
          ? `Password reset OTP sent to ${email} via Gmail. Check your inbox and spam folder.`
          : `Password reset OTP generated. (Dev Mode: ${otp})`,
      devOtp: dispatch.mode === "gmail" ? undefined : otp,
      resetUrl:
        dispatch.mode === "gmail"
          ? undefined
          : `/pages/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to initiate password reset." });
  }
});

app.post("/api/reset-password", async (req, res) => {
  try {
    const { token, email, otp, password, confirmPassword } = req.body;

    if (!password) {
      return res.status(400).json({ error: "New password is required." });
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({
        error: "Password and Confirm Password do not match.",
      });
    }

    if (!validatePasswordComplexity(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters long, alphanumeric, and contain at least one special symbol (@, #, $, etc.).",
      });
    }

    let userId = null;

    if (token) {
      const row = db
        .prepare(
          "SELECT * FROM reset_tokens WHERE token=? AND used=0 AND expires_at>?",
        )
        .get(token, Date.now());
      if (!row) {
        return res
          .status(400)
          .json({ error: "Password reset token is invalid or has expired." });
      }
      userId = row.user_id;
      db.prepare("UPDATE reset_tokens SET used=1 WHERE id=?").run(row.id);
    } else if (email && otp) {
      const emailNorm = String(email).trim().toLowerCase();
      const record = db
        .prepare(
          `
        SELECT * FROM otps
        WHERE email=? AND otp=? AND purpose='reset' AND used=0 AND expires_at > ?
        ORDER BY id DESC LIMIT 1
      `,
        )
        .get(emailNorm, String(otp).trim(), Date.now());

      if (!record) {
        return res.status(400).json({ error: "Invalid or expired OTP code." });
      }
      const u = db.prepare("SELECT id FROM users WHERE email=?").get(emailNorm);
      if (!u) {
        return res
          .status(404)
          .json({ error: "Enterprise user account not found." });
      }
      userId = u.id;
      db.prepare("UPDATE otps SET used=1 WHERE id=?").run(record.id);
    } else {
      return res.status(400).json({
        error:
          "Either a reset token or email + OTP is required to reset password.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, userId);
    res.json({
      ok: true,
      message: "Password has been successfully updated on Udyog Samyog.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
});

// ==========================================
// ENTERPRISE PROFILE & ACCOUNT SELF-DELETION
// ==========================================

// Fetch authenticated enterprise profile
app.get("/api/account", auth, (req, res) => {
  try {
    const user = db
      .prepare(
        `
      SELECT id, role, email, company_name, registration_no, phone, district, department, contact_person, is_banned, ban_reason, created_at
      FROM users
      WHERE id = ?
    `,
      )
      .get(req.session.user.id);

    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const appCount =
      db
        .prepare("SELECT COUNT(*) as count FROM applications WHERE user_id = ?")
        .get(user.id)?.count || 0;

    const docCount =
      db
        .prepare("SELECT COUNT(*) as count FROM documents WHERE user_id = ?")
        .get(user.id)?.count || 0;

    res.json({
      ...user,
      applicationsCount: appCount,
      documentsCount: docCount,
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

// Permanently Delete Own Company Account with "DELETE" confirmation
app.delete("/api/account", auth, (req, res) => {
  try {
    const { confirmation } = req.body || {};
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    // Strict validation: Must type "DELETE" in capital letters
    if (confirmation !== "DELETE") {
      return res.status(400).json({
        error:
          "Confirmation failed: You must type 'DELETE' in all capital letters to permanently delete your company account.",
      });
    }

    // Safety guard: only enterprise / applicant accounts can self-delete
    if (userRole !== "applicant") {
      return res.status(403).json({
        error:
          "Government departmental officer accounts cannot be self-deleted.",
      });
    }

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    // 1. Remove physical files on disk from uploads/
    const docs = db
      .prepare(
        `
      SELECT stored_name FROM documents
      WHERE user_id = ? OR application_id IN (SELECT id FROM applications WHERE user_id = ?)
    `,
      )
      .all(userId, userId);

    docs.forEach((d) => {
      try {
        const fp = path.join(uploadsDir, d.stored_name);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (_) {}
    });

    // 2. Cascade delete database records associated with this enterprise
    db.prepare(
      `
      DELETE FROM documents
      WHERE user_id = ? OR application_id IN (SELECT id FROM applications WHERE user_id = ?)
    `,
    ).run(userId, userId);

    db.prepare(
      `
      DELETE FROM queries
      WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)
    `,
    ).run(userId);

    db.prepare(
      `
      DELETE FROM inspections
      WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)
    `,
    ).run(userId);

    db.prepare("DELETE FROM applications WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM reset_tokens WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM otps WHERE email = ?").run(user.email);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    console.log(
      `[Udyog Samyog] Company account '${user.company_name}' (${user.email}) permanently deleted.`,
    );

    // 3. Destroy user session
    req.session.destroy(() => {
      res.json({
        ok: true,
        message: `Company account for '${user.company_name}' has been permanently deleted from Udyog Samyog.`,
      });
    });
  } catch (err) {
    console.error("Account deletion error:", err);
    res.status(500).json({ error: "Failed to delete account: " + err.message });
  }
});

// ==========================================
// ENTERPRISE MANAGEMENT & BANNING (APEX ONLY)
// ==========================================

// List all enterprises for Apex Officer scrutiny
app.get("/api/admin/enterprises", auth, apexOfficial, (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT u.id, u.company_name, u.registration_no, u.email, u.phone, u.district, u.contact_person,
             u.is_banned, u.ban_reason, u.banned_at, u.created_at,
             COUNT(a.id) as applications_count
      FROM users u
      LEFT JOIN applications a ON a.user_id = u.id
      WHERE u.role = 'applicant'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `,
      )
      .all();
    res.json(rows);
  } catch (err) {
    console.error("Error fetching enterprises:", err);
    res.status(500).json({ error: "Failed to load enterprises" });
  }
});

// Ban / Blacklist Enterprise from future approvals and permits
app.post("/api/admin/enterprises/:id/ban", auth, apexOfficial, (req, res) => {
  try {
    const userId = req.params.id;
    const { reason } = req.body;
    const target = db
      .prepare("SELECT * FROM users WHERE id=? AND role='applicant'")
      .get(userId);
    if (!target) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    const banReason =
      reason && String(reason).trim()
        ? String(reason).trim()
        : "Statutory violation of industrial safeguards / regulatory non-compliance.";

    db.prepare(
      `
      UPDATE users
      SET is_banned = 1, ban_reason = ?, banned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(banReason, userId);

    res.json({
      ok: true,
      message: `Enterprise '${target.company_name}' has been blacklisted and banned from future licenses and approvals.`,
    });
  } catch (err) {
    console.error("Error banning enterprise:", err);
    res.status(500).json({ error: "Failed to ban enterprise: " + err.message });
  }
});

// Unban / Re-instate Enterprise
app.post("/api/admin/enterprises/:id/unban", auth, apexOfficial, (req, res) => {
  try {
    const userId = req.params.id;
    const target = db
      .prepare("SELECT * FROM users WHERE id=? AND role='applicant'")
      .get(userId);
    if (!target) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    db.prepare(
      `
      UPDATE users
      SET is_banned = 0, ban_reason = NULL, banned_at = NULL
      WHERE id = ?
    `,
    ).run(userId);

    res.json({
      ok: true,
      message: `Enterprise '${target.company_name}' account has been reinstated.`,
    });
  } catch (err) {
    console.error("Error unbanning enterprise:", err);
    res.status(500).json({ error: "Failed to reinstate enterprise" });
  }
});

// ==========================================
// APPLICATION ROUTES
// ==========================================

app.post("/api/applications", auth, (req, res) => {
  try {
    // Check if applicant is banned/blacklisted
    const user = db
      .prepare("SELECT * FROM users WHERE id=?")
      .get(req.session.user.id);
    if (user && user.is_banned) {
      return res.status(403).json({
        error: `Your enterprise account has been blacklisted and banned from future statutory clearances by order of Directorate of Industries & MSInS. Reason: ${user.ban_reason || "Statutory non-compliance"}.`,
      });
    }

    const {
      industryCategory,
      landSize,
      waterUse,
      electricity,
      hazardous,
      location,
      district,
      projectCost,
      employmentPotential,
    } = req.body;

    const evaluation = evaluateRegulatoryChecklist({
      industryCategory,
      landSize,
      waterUse,
      electricity,
      hazardous,
      projectCost,
    });

    const seq = String(Date.now()).slice(-5);
    const appNo = `MH/MSInS/2026/${seq}`;

    const parallelStatus = {
      midc: {
        status: "Under Review",
        remarks: "Plot plan under verification",
        updated: new Date().toISOString(),
      },
      mpcb: {
        status:
          evaluation.riskTier === "Red"
            ? "In-depth Scrutiny"
            : "Fast Track Review",
        remarks: "CTE documentation pending review",
        updated: new Date().toISOString(),
      },
      fire: {
        status: "Under Review",
        remarks: "Initial inspection pending",
        updated: new Date().toISOString(),
      },
      dish: {
        status: "In Progress",
        remarks: "Safety blueprint uploaded",
        updated: new Date().toISOString(),
      },
      msedcl: {
        status: "Under Review",
        remarks: "Technical feasibility assessment",
        updated: new Date().toISOString(),
      },
    };

    const info = db
      .prepare(
        `
      INSERT INTO applications (
        user_id, application_no, company_name, registration_no, industry_category,
        land_size, water_use, electricity, hazardous, location, district,
        project_cost, employment_potential, msme_category, risk_tier, status,
        clearances_json, parallel_status_json, current_stage, stage_statuses
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'In Progress', ?, ?, 'mpcb', '{}')
    `,
      )
      .run(
        req.session.user.id,
        appNo,
        user?.company_name || req.session.user.companyName || "Industrial Unit",
        user?.registration_no ||
          req.session.user.registrationNo ||
          "GSTIN-PENDING",
        industryCategory || "Light Engineering",
        parseFloat(landSize) || 1.0,
        parseFloat(waterUse) || 10.0,
        parseFloat(electricity) || 100.0,
        hazardous ? 1 : 0,
        location || "Industrial Estate",
        district || user?.district || "Pune",
        parseFloat(projectCost) || 5.0,
        parseInt(employmentPotential, 10) || 50,
        evaluation.msme,
        evaluation.riskTier,
        JSON.stringify(evaluation.clearances),
        JSON.stringify(parallelStatus),
      );

    res.json({
      ok: true,
      id: info.lastInsertRowid,
      applicationNo: appNo,
      msmeCategory: evaluation.msme,
      riskTier: evaluation.riskTier,
      clearances: evaluation.clearances,
      schemes: evaluation.schemes,
    });
  } catch (err) {
    console.error("Error creating application:", err);
    res
      .status(500)
      .json({ error: "Failed to create application: " + err.message });
  }
});

app.get("/api/applications", auth, (req, res) => {
  try {
    if (req.session.user.role === "official") {
      const { status, risk_tier, district, search } = req.query;
      const deptCode = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      let query = `
        SELECT a.*, u.email as applicant_email, u.phone as applicant_phone, u.contact_person
        FROM applications a
        JOIN users u ON u.id = a.user_id
        WHERE 1=1
      `;
      const params = [];

      // Departmental visibility logic:
      if (!isApex && deptCode && deptCode !== "msins") {
        if (status === "Approved") {
          query += " AND (a.stage_statuses LIKE ? OR a.status = 'Approved')";
          params.push(`%"${deptCode}":{"decision":"Approved"%`);
        } else if (status === "In Progress" || status === "Flagged") {
          query += " AND a.current_stage = ? AND a.status = ?";
          params.push(deptCode, status);
        } else if (status === "Rejected") {
          query += " AND (a.current_stage = ? OR a.stage_statuses LIKE ?) AND a.status = 'Rejected'";
          params.push(deptCode, `%"${deptCode}":{"decision":"Rejected"%`);
        } else {
          // "all" or default: active at this stage, plus historical dossiers processed by this department
          query += " AND (a.current_stage = ? OR a.stage_statuses LIKE ?)";
          params.push(deptCode, `%"${deptCode}"%`);
        }
      } else if (!isApex && deptCode === "msins") {
        query += " AND (a.current_stage = 'msins' OR a.stage_statuses LIKE '%\"msins\"%')";
        if (status && status !== "all") {
          query += " AND a.status = ?";
          params.push(status);
        }
      } else {
        // Apex authority sees all applications
        if (status && status !== "all") {
          query += " AND a.status = ?";
          params.push(status);
        }
      }
      if (risk_tier && risk_tier !== "all") {
        query += " AND a.risk_tier = ?";
        params.push(risk_tier);
      }
      if (district && district !== "all") {
        query += " AND a.district = ?";
        params.push(district);
      }
      if (search) {
        query +=
          " AND (a.application_no LIKE ? OR a.company_name LIKE ? OR a.location LIKE ?)";
        const like = `%${search}%`;
        params.push(like, like, like);
      }

      query += " ORDER BY a.created_at DESC";
      const rows = db.prepare(query).all(...params);
      res.json(rows);
    } else {
      const rows = db
        .prepare(
          `
        SELECT * FROM applications
        WHERE user_id = ?
        ORDER BY created_at DESC
      `,
        )
        .all(req.session.user.id);
      res.json(rows);
    }
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Could not fetch applications" });
  }
});

app.get("/api/applications/:id", auth, (req, res) => {
  try {
    const appId = req.params.id;
    const a = db
      .prepare(
        `
      SELECT a.*, u.email as applicant_email, u.phone as applicant_phone, u.contact_person, u.department as user_dept
      FROM applications a
      JOIN users u ON u.id = a.user_id
      WHERE a.id = ?
    `,
      )
      .get(appId);

    if (!a) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      req.session.user.role !== "official" &&
      a.user_id !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Access denied to this dossier" });
    }

    // Parse JSON configurations
    let clearances = [];
    try {
      clearances = JSON.parse(a.clearances_json || "[]");
    } catch (_) {}

    let parallelStatus = {};
    try {
      parallelStatus = JSON.parse(a.parallel_status_json || "{}");
    } catch (_) {}

    let stageStatuses = {};
    try {
      stageStatuses = JSON.parse(a.stage_statuses || "{}");
    } catch (_) {}

    // Fetch documents
    const documents = db
      .prepare(
        `
      SELECT id, document_type, original_name, stored_name, mime_type, size, verification_status, officer_remarks, created_at
      FROM documents
      WHERE application_id = ?
      ORDER BY created_at ASC
    `,
      )
      .all(appId);

    // Fetch queries
    const queries = db
      .prepare(
        `
      SELECT q.*, u.company_name as officer_dept, u.contact_person as officer_name
      FROM queries q
      JOIN users u ON u.id = q.officer_id
      WHERE q.application_id = ?
      ORDER BY q.created_at DESC
    `,
      )
      .all(appId);

    // Fetch inspections
    const inspections = db
      .prepare(
        `
      SELECT * FROM inspections
      WHERE application_id = ?
      ORDER BY scheduled_date ASC
    `,
      )
      .all(appId);

    // Recommend incentives
    const schemesInfo = evaluateRegulatoryChecklist({
      landSize: a.land_size,
      waterUse: a.water_use,
      electricity: a.electricity,
      hazardous: a.hazardous,
      projectCost: a.project_cost,
      industryCategory: a.industry_category,
    });

    res.json({
      ...a,
      clearances,
      parallelStatus,
      stageStatuses,
      currentStage: a.current_stage || "mpcb",
      documents,
      queries,
      inspections,
      eligibleSchemes: schemesInfo.schemes,
    });
  } catch (err) {
    console.error("Error fetching dossier:", err);
    res.status(500).json({ error: "Failed to fetch application dossier" });
  }
});

// ==========================================
// DOCUMENT STORAGE & INLINE PREVIEW ROUTES
// ==========================================

app.post(
  "/api/applications/:id/documents",
  auth,
  upload.single("document"),
  (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Please choose a valid PDF, JPG, or PNG document." });
      }

      const appId = req.params.id;
      const a = db.prepare("SELECT * FROM applications WHERE id=?").get(appId);

      if (!a) {
        return res.status(404).json({ error: "Application not found" });
      }

      if (
        req.session.user.role !== "official" &&
        a.user_id !== req.session.user.id
      ) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res
          .status(403)
          .json({ error: "Not authorized to upload to this application." });
      }

      if (req.session.user.role === "applicant") {
        const u = db
          .prepare("SELECT is_banned, ban_reason FROM users WHERE id=?")
          .get(req.session.user.id);
        if (u && u.is_banned) {
          if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
          return res.status(403).json({
            error: `Your enterprise account has been blacklisted: ${u.ban_reason || "Statutory non-compliance"}. Document uploads are prohibited.`,
          });
        }
      }

      const info = db
        .prepare(
          `
      INSERT INTO documents (
        application_id, user_id, document_type, original_name, stored_name, mime_type, size, verification_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `,
        )
        .run(
          a.id,
          req.session.user.id,
          req.body.documentType || "Other Mandatory Document",
          req.file.originalname,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
        );

      res.json({
        ok: true,
        id: info.lastInsertRowid,
        originalName: req.file.originalname,
        documentType: req.body.documentType,
        size: req.file.size,
        mimeType: req.file.mimetype,
        message: "Document stored securely in the industrial vault.",
      });
    } catch (err) {
      console.error("Document upload error:", err);
      res.status(500).json({ error: "Document upload failed: " + err.message });
    }
  },
);

app.get("/api/applications/:id/documents", auth, (req, res) => {
  try {
    const a = db
      .prepare("SELECT user_id FROM applications WHERE id=?")
      .get(req.params.id);
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (
      req.session.user.role !== "official" &&
      a.user_id !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const docs = db
      .prepare(
        `
      SELECT id, document_type, original_name, mime_type, size, verification_status, officer_remarks, created_at
      FROM documents
      WHERE application_id = ?
      ORDER BY created_at ASC
    `,
      )
      .all(req.params.id);

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list documents" });
  }
});

// CRITICAL FIX: Inline document preview for Government Officials & Applicants
app.get("/api/documents/:id/view", auth, (req, res) => {
  try {
    const docId = req.params.id;
    const d = db
      .prepare(
        `
      SELECT d.*, a.user_id as owner_id
      FROM documents d
      JOIN applications a ON a.id = d.application_id
      WHERE d.id = ?
    `,
      )
      .get(docId);

    if (!d) {
      return res.status(404).send("Document not found in storage vault.");
    }

    if (
      req.session.user.role !== "official" &&
      d.owner_id !== req.session.user.id
    ) {
      return res
        .status(403)
        .send(
          "Access denied. You do not have permissions to view this document.",
        );
    }

    const filePath = path.join(uploadsDir, d.stored_name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File missing on disk.");
    }

    // Send file inline with correct content-type so browser iframe / img renders it!
    res.setHeader("Content-Type", d.mime_type || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(d.original_name)}"`,
    );
    res.sendFile(filePath);
  } catch (err) {
    console.error("Error viewing document:", err);
    res.status(500).send("Internal error displaying document.");
  }
});

// Download attachment
app.get("/api/documents/:id", auth, (req, res) => {
  try {
    const d = db
      .prepare(
        `
      SELECT d.*, a.user_id as owner_id
      FROM documents d
      JOIN applications a ON a.id = d.application_id
      WHERE d.id = ?
    `,
      )
      .get(req.params.id);

    if (!d) return res.status(404).json({ error: "Document not found" });
    if (
      req.session.user.role !== "official" &&
      d.owner_id !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const filePath = path.join(uploadsDir, d.stored_name);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: "File not found on server storage" });
    }

    res.download(filePath, d.original_name);
  } catch (err) {
    res.status(500).json({ error: "Download failed" });
  }
});

// Officer document verification
app.patch("/api/documents/:id/verify", auth, official, (req, res) => {
  try {
    const { status, remarks } = req.body;
    db.prepare(
      `
      UPDATE documents
      SET verification_status = ?, officer_remarks = ?
      WHERE id = ?
    `,
    ).run(status || "Verified", remarks || "", req.params.id);

    res.json({ ok: true, message: "Document scrutiny updated." });
  } catch (err) {
    res.status(500).json({ error: "Failed to update document status" });
  }
});

// ==========================================
// WORKFLOW, QUERIES & INSPECTION ROUTES
// ==========================================

// =============================================
// SEQUENTIAL PIPELINE STAGE DECISION (PRIMARY)
// =============================================
// Pipeline order: mpcb → midc → dish → fire → msins → completed
const PIPELINE_STAGES = ["mpcb", "midc", "dish", "fire", "msins"];
const STAGE_LABELS = {
  mpcb: "MPCB (Environmental Clearance)",
  midc: "MIDC (Civil & Infrastructure)",
  dish: "DISH (Factory Safety)",
  fire: "Maharashtra Fire Services",
  msins: "MSInS Apex Officer (Final Approval)",
};

app.post(
  "/api/applications/:id/stage-decision",
  auth,
  official,
  (req, res) => {
    try {
      const appId = req.params.id;
      const { decision, remarks } = req.body;

      if (!decision || !["Approved", "Rejected", "Query"].includes(decision)) {
        return res.status(400).json({
          error: "Decision must be 'Approved', 'Rejected', or 'Query'.",
        });
      }

      const appRow = db
        .prepare("SELECT * FROM applications WHERE id=?")
        .get(appId);
      if (!appRow) {
        return res.status(404).json({ error: "Application not found." });
      }

      if (appRow.status === "Approved" || appRow.status === "Rejected") {
        return res.status(400).json({
          error: `Application is already ${appRow.status}. No further decisions can be made.`,
        });
      }

      const currentStage = appRow.current_stage || "mpcb";
      const officerDept = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      // Authorization: officer can only act on their own stage (or apex sees all)
      if (!isApex && officerDept !== currentStage) {
        return res.status(403).json({
          error: `This application is currently at the ${STAGE_LABELS[currentStage] || currentStage.toUpperCase()} stage. You (${(officerDept || "").toUpperCase()}) are not authorized to act on it yet.`,
        });
      }

      let stageStatuses = {};
      try {
        stageStatuses = JSON.parse(appRow.stage_statuses || "{}");
      } catch (_) {}

      // Record this stage's decision
      stageStatuses[currentStage] = {
        decision,
        remarks: (remarks || "").trim() || `${decision} by ${STAGE_LABELS[currentStage]}.`,
        officer: req.session.user.contactPerson || req.session.user.email,
        officer_dept: STAGE_LABELS[currentStage],
        decided_at: new Date().toISOString(),
      };

      // Synchronize parallel_status_json and clearances_json so tracker and verification pages stay in sync
      let parallelStatus = {};
      try {
        parallelStatus = JSON.parse(appRow.parallel_status_json || "{}");
      } catch (_) {}

      if (!parallelStatus[currentStage]) {
        parallelStatus[currentStage] = {};
      }
      parallelStatus[currentStage].status =
        decision === "Approved"
          ? "Approved"
          : decision === "Rejected"
            ? "Deficient"
            : "Query Raised";
      if (remarks) parallelStatus[currentStage].remarks = remarks.trim();
      parallelStatus[currentStage].officer =
        req.session.user.contactPerson || req.session.user.email;
      parallelStatus[currentStage].updated = new Date().toISOString();

      let clearances = [];
      try {
        clearances = JSON.parse(appRow.clearances_json || "[]");
      } catch (_) {}

      clearances = clearances.map((c) => {
        if (
          c.taskDept === currentStage ||
          (!c.taskDept && (c.dept || "").toLowerCase().includes(currentStage))
        ) {
          return {
            ...c,
            status:
              decision === "Approved"
                ? "Approved"
                : decision === "Rejected"
                  ? "Deficient"
                  : "Under Review",
          };
        }
        return c;
      });

      if (decision === "Rejected") {
        // Rejection freezes the pipeline permanently
        db.prepare(`
          UPDATE applications
          SET status = 'Rejected', stage_statuses = ?, parallel_status_json = ?, clearances_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(stageStatuses), JSON.stringify(parallelStatus), JSON.stringify(clearances), appId);

        return res.json({
          ok: true,
          message: `Application rejected at ${STAGE_LABELS[currentStage]} stage. Pipeline halted.`,
          currentStage,
          nextStage: null,
          status: "Rejected",
        });
      }

      if (decision === "Query") {
        // Raise a query (flags application without advancing stage)
        if (!remarks || !remarks.trim()) {
          return res.status(400).json({
            error: "A query message is required when raising a query.",
          });
        }
        db.prepare(`
          INSERT INTO queries (application_id, officer_id, message, status)
          VALUES (?, ?, ?, 'Open')
        `).run(appId, req.session.user.id, remarks.trim());

        db.prepare(`
          UPDATE applications
          SET status = 'Flagged', parallel_status_json = ?, clearances_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(JSON.stringify(parallelStatus), JSON.stringify(clearances), appId);

        return res.json({
          ok: true,
          message: "Query raised. Applicant has been notified to respond.",
          currentStage,
          status: "Flagged",
        });
      }

      // Decision = "Approved" — advance to next stage
      const currentIdx = PIPELINE_STAGES.indexOf(currentStage);
      const nextStage = PIPELINE_STAGES[currentIdx + 1] || "completed";

      let newStatus = "In Progress";
      if (nextStage === "completed") {
        newStatus = "Approved";
      }

      db.prepare(`
        UPDATE applications
        SET current_stage = ?, stage_statuses = ?, parallel_status_json = ?, clearances_json = ?, status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        nextStage === "completed" ? "completed" : nextStage,
        JSON.stringify(stageStatuses),
        JSON.stringify(parallelStatus),
        JSON.stringify(clearances),
        newStatus,
        appId,
      );

      console.log(`[Pipeline] App ${appRow.application_no}: ${currentStage} → ${nextStage} (${newStatus})`);

      res.json({
        ok: true,
        message: nextStage === "completed"
          ? `Final approval granted by MSInS Apex. Application is now Approved.`
          : `Approved at ${STAGE_LABELS[currentStage]}. Forwarded to ${STAGE_LABELS[nextStage] || nextStage}.`,
        currentStage,
        nextStage,
        status: newStatus,
        stageStatuses,
      });
    } catch (err) {
      console.error("Stage decision error:", err);
      res.status(500).json({ error: "Failed to record stage decision: " + err.message });
    }
  },
);

// Also add a GET route so officers can check which stage an application is at
app.get("/api/applications/:id/pipeline", auth, (req, res) => {
  try {
    const a = db
      .prepare("SELECT id, application_no, company_name, status, current_stage, stage_statuses FROM applications WHERE id=?")
      .get(req.params.id);
    if (!a) return res.status(404).json({ error: "Application not found" });

    let stageStatuses = {};
    try { stageStatuses = JSON.parse(a.stage_statuses || "{}"); } catch (_) {}

    const stages = PIPELINE_STAGES.map((s) => ({
      code: s,
      label: STAGE_LABELS[s],
      status: stageStatuses[s]
        ? stageStatuses[s].decision
        : a.current_stage === s
          ? "Pending"
          : PIPELINE_STAGES.indexOf(s) < PIPELINE_STAGES.indexOf(a.current_stage || "mpcb")
            ? "Approved"
            : "Waiting",
      remarks: stageStatuses[s]?.remarks || null,
      officer: stageStatuses[s]?.officer || null,
      decided_at: stageStatuses[s]?.decided_at || null,
    }));

    res.json({
      applicationNo: a.application_no,
      companyName: a.company_name,
      overallStatus: a.status,
      currentStage: a.current_stage,
      stages,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pipeline status" });
  }
});


app.patch(
  "/api/applications/:id/department-clearance",
  auth,
  official,
  (req, res) => {
    try {
      const appId = req.params.id;
      const { deptCode, status, remarks } = req.body;

      if (!deptCode || !status) {
        return res.status(400).json({
          error: "Department code and clearance status are required.",
        });
      }

      // Authorization check: Only officer of that department or Apex officer can update this department's milestone
      const officerDept = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      if (!isApex && officerDept && officerDept !== deptCode) {
        return res.status(403).json({
          error: `Access Denied: You belong to ${officerDept.toUpperCase()} and are not authorized to update ${deptCode.toUpperCase()} clearances.`,
        });
      }

      const appRow = db
        .prepare("SELECT * FROM applications WHERE id=?")
        .get(appId);
      if (!appRow) {
        return res
          .status(404)
          .json({ error: "Application dossier not found." });
      }

      let parallelStatus = {};
      try {
        parallelStatus = JSON.parse(appRow.parallel_status_json || "{}");
      } catch (_) {}

      if (!parallelStatus[deptCode]) {
        parallelStatus[deptCode] = {};
      }

      parallelStatus[deptCode].status = status;
      if (remarks) parallelStatus[deptCode].remarks = remarks;
      parallelStatus[deptCode].officer = req.session.user.contactPerson;
      parallelStatus[deptCode].updated = new Date().toISOString();

      // Synchronize clearances_json
      let clearances = [];
      try {
        clearances = JSON.parse(appRow.clearances_json || "[]");
      } catch (_) {}

      let stageStatuses = {};
      try {
        stageStatuses = JSON.parse(appRow.stage_statuses || "{}");
      } catch (_) {}

      let currentStage = appRow.current_stage || "mpcb";
      let overallStatus = appRow.status;

      if (status === "Approved") {
        stageStatuses[deptCode] = {
          decision: "Approved",
          remarks: remarks || `Approved by ${STAGE_LABELS[deptCode] || deptCode.toUpperCase()}`,
          officer: req.session.user.contactPerson || req.session.user.email,
          officer_dept: STAGE_LABELS[deptCode] || deptCode.toUpperCase(),
          decided_at: new Date().toISOString(),
        };

        if (currentStage === deptCode) {
          const currentIdx = PIPELINE_STAGES.indexOf(currentStage);
          const nextStage = PIPELINE_STAGES[currentIdx + 1] || "completed";
          currentStage = nextStage;
          if (nextStage === "completed") {
            overallStatus = "Approved";
          }
        }
      } else if (status === "Rejected" && currentStage === deptCode) {
        stageStatuses[deptCode] = {
          decision: "Rejected",
          remarks: remarks || `Rejected by ${STAGE_LABELS[deptCode] || deptCode.toUpperCase()}`,
          officer: req.session.user.contactPerson || req.session.user.email,
          officer_dept: STAGE_LABELS[deptCode] || deptCode.toUpperCase(),
          decided_at: new Date().toISOString(),
        };
        overallStatus = "Rejected";
      }

      const deptMatches = {
        midc: ["midc", "land", "building"],
        mpcb: ["mpcb", "consent to establish", "cte"],
        fire: ["fire"],
        dish: ["dish", "factory"],
        msedcl: ["msedcl", "power", "ht", "lt"],
      };

      clearances = clearances.map((c) => {
        if (c.taskDept) {
          if (c.taskDept === deptCode) {
            return { ...c, status };
          }
          return c;
        }
        const cDept = (c.dept || "").toLowerCase();
        const cName = (c.name || "").toLowerCase();
        const matches = deptMatches[deptCode] || [deptCode];
        const isMatch = matches.some(
          (m) => cDept.includes(m) || cName.includes(m),
        );
        if (isMatch) {
          return { ...c, status };
        }
        return c;
      });

      db.prepare(
        `
      UPDATE applications
      SET parallel_status_json = ?, clearances_json = ?, stage_statuses = ?, current_stage = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      ).run(
        JSON.stringify(parallelStatus),
        JSON.stringify(clearances),
        JSON.stringify(stageStatuses),
        currentStage,
        overallStatus,
        appId,
      );

      res.json({
        ok: true,
        message: `${deptCode.toUpperCase()} milestone status updated to '${status}'.`,
        parallelStatus,
        clearances,
        currentStage,
        overallStatus,
      });
    } catch (err) {
      console.error("Department clearance error:", err);
      res.status(500).json({
        error: "Failed to update departmental clearance: " + err.message,
      });
    }
  },
);

// Update overall status (Grant Final Consolidated Approval or Rejection) - APEX RESTRICTED
app.patch("/api/applications/:id/status", auth, official, (req, res) => {
  try {
    const { status, remarks, department, parallelStatus } = req.body;
    const appId = req.params.id;

    // Final Approval or Rejection of the entire dossier is strictly reserved for MSInS Apex Officer
    if (
      (status === "Approved" || status === "Rejected") &&
      !req.session.user.isApex
    ) {
      return res.status(403).json({
        error:
          "Consolidated Single-Window Final Approval and NOC issuance is strictly reserved for the Department Officer (MSInS / Industries) - Apex Authority.",
      });
    }

    if (parallelStatus) {
      db.prepare(
        `
        UPDATE applications
        SET status = ?, parallel_status_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      ).run(status, JSON.stringify(parallelStatus), appId);
    } else {
      db.prepare(
        `
        UPDATE applications
        SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      ).run(status, appId);
    }

    res.json({ ok: true, message: `Application status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Officer raises query
app.post("/api/applications/:id/query", auth, official, (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Query message cannot be blank." });
    }

    const appId = req.params.id;
    const appRow = db
      .prepare("SELECT * FROM applications WHERE id=?")
      .get(appId);
    if (!appRow) {
      return res.status(404).json({ error: "Application not found." });
    }
    if (appRow.status === "Approved" || appRow.status === "Rejected") {
      return res.status(400).json({
        error: `Cannot raise queries on an application that is already ${appRow.status}.`,
      });
    }

    db.prepare(
      `
      INSERT INTO queries (application_id, officer_id, message, status)
      VALUES (?, ?, ?, 'Open')
    `,
    ).run(appId, req.session.user.id, message.trim());

    // Flag the application
    db.prepare(
      "UPDATE applications SET status='Flagged', updated_at=CURRENT_TIMESTAMP WHERE id=?",
    ).run(appId);

    res.json({
      ok: true,
      message: "Query raised. Applicant notified for clarification.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to record query" });
  }
});

// Applicant responds to query (with optional revised document)
app.post(
  "/api/queries/:id/reply",
  auth,
  upload.single("revisedDocument"),
  (req, res) => {
    try {
      const queryId = req.params.id;
      const { reply } = req.body;

      // Check if applicant is banned
      const user = db
        .prepare("SELECT * FROM users WHERE id=?")
        .get(req.session.user.id);
      if (user && user.is_banned) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res.status(403).json({
          error: `Your enterprise account has been blacklisted and banned. Reason: ${user.ban_reason || "Statutory non-compliance"}.`,
        });
      }

      const q = db
        .prepare(
          `
      SELECT q.*, a.user_id as applicant_id
      FROM queries q
      JOIN applications a ON a.id = q.application_id
      WHERE q.id = ?
    `,
        )
        .get(queryId);

      if (!q) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res.status(404).json({ error: "Query not found" });
      }
      if (
        req.session.user.role !== "official" &&
        q.applicant_id !== req.session.user.id
      ) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res
          .status(403)
          .json({ error: "Unauthorized to reply to this query" });
      }

      let fileId = null;
      let fileName = null;

      if (req.file) {
        fileName = req.file.originalname;
        const docInfo = db
          .prepare(
            `
        INSERT INTO documents (
          application_id, user_id, document_type, original_name, stored_name, mime_type, size, verification_status, officer_remarks
        ) VALUES (?, ?, 'Revised Compliance Document', ?, ?, ?, ?, 'Pending', 'Uploaded in response to query')
      `,
          )
          .run(
            q.application_id,
            req.session.user.id,
            req.file.originalname,
            req.file.filename,
            req.file.mimetype,
            req.file.size,
          );
        fileId = docInfo.lastInsertRowid;
      }

      db.prepare(
        `
      UPDATE queries
      SET applicant_reply = ?, reply_file_id = ?, reply_file_name = ?, status = 'Resolved', resolved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      ).run(
        reply || "Revised document and clarifications submitted.",
        fileId,
        fileName,
        queryId,
      );

      // If all queries on this application are now resolved, return status to In Progress (only if Flagged)
      const openQueries = db
        .prepare(
          "SELECT COUNT(*) as c FROM queries WHERE application_id=? AND status='Open'",
        )
        .get(q.application_id).c;
      if (openQueries === 0) {
        db.prepare(
          "UPDATE applications SET status='In Progress', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='Flagged'",
        ).run(q.application_id);
      }

      res.json({ ok: true, message: "Clarification submitted successfully." });
    } catch (err) {
      console.error("Error replying to query:", err);
      res.status(500).json({ error: "Failed to record reply: " + err.message });
    }
  },
);

// Officer schedules joint inspection
app.post("/api/applications/:id/inspections", auth, official, (req, res) => {
  try {
    const { department, scheduledDate, inspectorName, notes } = req.body;
    if (!department || !scheduledDate) {
      return res
        .status(400)
        .json({ error: "Department and Inspection Date are required." });
    }

    const appId = req.params.id;
    const appRow = db
      .prepare("SELECT * FROM applications WHERE id=?")
      .get(appId);
    if (!appRow) {
      return res.status(404).json({ error: "Application not found." });
    }
    if (appRow.status === "Approved" || appRow.status === "Rejected") {
      return res.status(400).json({
        error: `Cannot schedule inspections for an application that is already ${appRow.status}.`,
      });
    }

    db.prepare(
      `
      INSERT INTO inspections (application_id, officer_id, department, scheduled_date, inspector_name, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    ).run(
      appId,
      req.session.user.id,
      department,
      scheduledDate,
      inspectorName || "Senior Divisional Officer",
      notes || "Joint on-site compliance verification",
    );

    res.json({ ok: true, message: "Joint on-site inspection scheduled." });
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule inspection" });
  }
});

app.get("/api/applications/:id/inspections", auth, (req, res) => {
  try {
    const list = db
      .prepare(
        "SELECT * FROM inspections WHERE application_id=? ORDER BY scheduled_date ASC",
      )
      .all(req.params.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: "Failed to list inspections" });
  }
});

// Digital Clearance Certificate & Verifiable NOC
app.get("/api/applications/:id/certificate", auth, (req, res) => {
  try {
    const a = db
      .prepare(
        `
      SELECT a.*, u.email as applicant_email, u.company_name
      FROM applications a
      JOIN users u ON u.id = a.user_id
      WHERE a.id = ?
    `,
      )
      .get(req.params.id);

    if (!a) return res.status(404).json({ error: "Application not found" });
    if (
      req.session.user.role !== "official" &&
      a.user_id !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (a.status !== "Approved") {
      return res.status(400).json({
        error: "Clearance Certificate can only be issued for approved applications.",
      });
    }

    const certNo = `NOC/MH/IND/${a.id}/${new Date(a.created_at).getFullYear()}`;
    const certHash = crypto
      .createHash("sha256")
      .update(`${a.application_no}-${a.company_name}-APPROVED-MAHARASHTRA`)
      .digest("hex")
      .toUpperCase()
      .slice(0, 24);

    res.json({
      certificateNo: certNo,
      applicationNo: a.application_no,
      companyName: a.company_name,
      registrationNo: a.registration_no,
      location: a.location,
      district: a.district,
      industryCategory: a.industry_category,
      riskTier: a.risk_tier,
      status: a.status,
      issuedBy: "Government of Maharashtra - Directorate of Industries & MSInS",
      issuedDate: new Date().toISOString().split("T")[0],
      validUntil: `${new Date().getFullYear() + 5}-03-31`,
      verificationHash: certHash,
      statutoryAct:
        "Maharashtra Industrial Development Act, 1961 & Single Window Act",
    });
  } catch (err) {
    res.status(500).json({ error: "Could not generate certificate data" });
  }
});

// ==========================================
// REGULATORY KNOWLEDGE & SCHEMES ROUTE
// ==========================================

app.get("/api/schemes/eligible", (req, res) => {
  const {
    landSize,
    waterUse,
    electricity,
    hazardous,
    projectCost,
    industryCategory,
  } = req.query;
  const result = evaluateRegulatoryChecklist({
    landSize,
    waterUse,
    electricity,
    hazardous: hazardous === "1" || hazardous === "true",
    projectCost,
    industryCategory,
  });
  res.json(result);
});

// ==========================================
// ANALYTICS & INTELLIGENCE ROUTE
// ==========================================

app.get("/api/analytics/summary", auth, official, (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;
    const inProgress = db
      .prepare(
        "SELECT COUNT(*) as c FROM applications WHERE status='In Progress'",
      )
      .get().c;
    const flagged = db
      .prepare("SELECT COUNT(*) as c FROM applications WHERE status='Flagged'")
      .get().c;
    const approved = db
      .prepare("SELECT COUNT(*) as c FROM applications WHERE status='Approved'")
      .get().c;
    const rejected = db
      .prepare("SELECT COUNT(*) as c FROM applications WHERE status='Rejected'")
      .get().c;

    const districtCounts = db
      .prepare(
        `
      SELECT district, COUNT(*) as count
      FROM applications
      GROUP BY district
    `,
      )
      .all();

    const riskCounts = db
      .prepare(
        `
      SELECT risk_tier, COUNT(*) as count
      FROM applications
      GROUP BY risk_tier
    `,
      )
      .all();

    res.json({
      kpis: {
        totalApplications: total,
        pendingReviews: inProgress,
        flaggedQueries: flagged,
        approvedTotal: approved,
        rejectedTotal: rejected,
        slaBreaches: Math.floor(inProgress * 0.15),
        averageTurnaroundDays: 8.4,
      },
      departmentClearanceTimes: [
        {
          department: "MIDC Land & Building Plan",
          avgDays: 5.2,
          slaTarget: 7,
          complianceRate: "94%",
        },
        {
          department: "MPCB Environmental Consent",
          avgDays: 12.8,
          slaTarget: 15,
          complianceRate: "88%",
        },
        {
          department: "Maharashtra Fire Services NOC",
          avgDays: 6.5,
          slaTarget: 7,
          complianceRate: "91%",
        },
        {
          department: "DISH Factory & Safety Clearance",
          avgDays: 7.9,
          slaTarget: 10,
          complianceRate: "92%",
        },
        {
          department: "MSEDCL Industrial Power Connection",
          avgDays: 4.1,
          slaTarget: 5,
          complianceRate: "96%",
        },
      ],
      bottlenecks: [
        {
          stage: "Initial Scrutiny & Document Pre-Validation",
          avgTime: "1.5 Days",
          dropOffRate: "4%",
        },
        {
          stage: "Department Technical Evaluation",
          avgTime: "4.2 Days",
          dropOffRate: "12%",
        },
        {
          stage: "Joint Physical On-Site Inspection",
          avgTime: "2.8 Days",
          dropOffRate: "7%",
        },
        {
          stage: "Final Integrated NOC Issuance",
          avgTime: "1.1 Days",
          dropOffRate: "1%",
        },
      ],
      districtData:
        districtCounts.length > 0
          ? districtCounts
          : [
              { district: "Pune", count: 18 },
              { district: "Thane", count: 12 },
              { district: "Chhatrapati Sambhajinagar", count: 9 },
              { district: "Nagpur", count: 7 },
              { district: "Nashik", count: 6 },
              { district: "Mumbai MMR", count: 14 },
            ],
      riskData:
        riskCounts.length > 0
          ? riskCounts
          : [
              { risk_tier: "Green", count: 24 },
              { risk_tier: "Orange", count: 18 },
              { risk_tier: "Red", count: 8 },
            ],
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ error: "Failed to aggregate analytics" });
  }
});

// Root route
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/pages/login.html")),
);

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`UDYOG SAMYOG - Maharashtra Single Window Industrial Portal`);
    console.log(`Server live on http://localhost:${PORT}`);
    console.log(
      `1. MSInS Apex Officer: officer@udyog.gov.in / Officer@123# (Final Approver)`,
    );
    console.log(`2. MIDC Civil: midc.officer@udyog.gov.in / Midc@123#`);
    console.log(`3. MPCB Environment: mpcb.officer@udyog.gov.in / Mpcb@123#`);
    console.log(`4. Fire Services: fire.officer@udyog.gov.in / Fire@123#`);
    console.log(
      `5. DISH Factory Safety: dish.officer@udyog.gov.in / Dish@123#`,
    );
    console.log(
      `6. Demo Applicant: entrepreneur@mahindra-auto.in / Applicant@123#`,
    );
    console.log(`====================================================`);
  });
}

module.exports = app;
