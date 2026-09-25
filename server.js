"use strict";
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

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

const { connectDB } = require("./db/models");
const { seedInitialData } = require("./db/seed");

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure storage directories exist
const dataDir = path.join(__dirname, "data");
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware setup
app.use(
  helmet({
    contentSecurityPolicy: false,
    hsts: false, // Disable HSTS in local development so browsers don't force https://localhost
  }),
);
// Explicitly clear any previously cached HSTS in browsers
app.use((req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=0");
  next();
});
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

app.use("/sample-pdfs", express.static(path.join(__dirname, "sample-pdfs")));
app.use(express.static(path.join(__dirname, "public")));

// Mount Modular Route Handlers
app.use(require("./routes/auth"));
app.use(require("./routes/admin"));
app.use(require("./routes/applications"));
app.use(require("./routes/documents"));
app.use(require("./routes/queries"));
app.use(require("./routes/inspections"));
app.use(require("./routes/analytics"));
app.use(require("./routes/ai"));

// Root route
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/pages/login.html")),
);

// Export app for test suites
module.exports = app;

// Start server if run directly
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedInitialData();

      app.listen(PORT, () => {
        console.log(`================================================================================`);
        console.log(`🏛️  UDYOG SAMYOG - Maharashtra Single Window Industrial Portal`);
        console.log(`🚀 Server live on http://localhost:${PORT} (MongoDB Database Engine)`);
        console.log(`--------------------------------------------------------------------------------`);
        console.log(
          `1. Maharashtra State Innovation Society (Apex Approver): officer@udyog.gov.in / Officer@123#`,
        );
        console.log(
          `2. Maharashtra Industrial Development Corporation (Civil Infrastructure): midc.officer@udyog.gov.in / Midc@123#`,
        );
        console.log(
          `3. Maharashtra Pollution Control Board (Environmental Review): mpcb.officer@udyog.gov.in / Mpcb@123#`,
        );
        console.log(
          `4. Directorate of Maharashtra Fire Services (Life Safety): fire.officer@udyog.gov.in / Fire@123#`,
        );
        console.log(
          `5. Directorate of Industrial Safety & Health (Factory Safety): dish.officer@udyog.gov.in / Dish@123#`,
        );
        console.log(
          `6. Enterprise Applicant (Industrial Unit Applicant): entrepreneur@mahindra-auto.in / Applicant@123#`,
        );
        console.log(`================================================================================`);
      });
    } catch (err) {
      console.error("[FATAL] Server startup failure:", err);
      process.exit(1);
    }
  })();
}
