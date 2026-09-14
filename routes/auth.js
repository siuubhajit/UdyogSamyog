"use strict";
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { User, ResetToken, Otp, Application, Document, Query, Inspection } = require("../db/models");
const {
  uploadsDir,
  envPath,
  validatePasswordComplexity,
  loginRateLimiter,
  otpSendRateLimiter,
  forgotPasswordRateLimiter,
  customGmailConfig,
  getEmailTransporter,
  sendOtpEmail,
  auth,
  serialize,
  toObjectId,
} = require("../utils/helpers");

const OTP_EXPIRY_MS = 90 * 1000; // 1 minute 30 seconds (90 seconds)

// Send OTP via Gmail or Dev Fallback
router.post(
  "/api/otp/send",
  otpSendRateLimiter.middleware((req) => `${req.ip || "ip"}:${(req.body?.email || "").toLowerCase()}`),
  async (req, res) => {
    try {
      const { email, purpose } = req.body;
      if (!email || !purpose) {
        return res.status(400).json({ error: "Email and purpose are required." });
      }
      const emailNorm = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }

      if (purpose === "registration") {
        const existing = await User.findOne({ email: emailNorm }).lean();
        if (existing) {
          return res.status(400).json({
            error: `An enterprise account is already registered with email '${emailNorm}'. Please sign in or use a different email address.`,
          });
        }
      } else if (purpose === "reset") {
        const existing = await User.findOne({ email: emailNorm }).lean();
        if (!existing) {
          return res.status(404).json({
            error: `No registered account found with email '${emailNorm}'. Please verify your email or register a new enterprise profile.`,
          });
        }
      }

      const otpCode = String(crypto.randomInt(100000, 999999));
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      await Otp.updateMany({ email: emailNorm, purpose }, { $set: { used: 1 } });

      await Otp.create({
        email: emailNorm,
        otp: otpCode,
        purpose,
        expires_at: expiresAt,
        used: 0,
        attempts: 0,
      });

      const dispatchResult = await sendOtpEmail(emailNorm, otpCode, purpose);

      console.log(
        `[/api/otp/send] Successfully issued OTP for ${emailNorm} (mode: ${dispatchResult.mode}, expires in 90s)`,
      );

      res.json({
        ok: true,
        message: `Verification One-Time Password sent to ${emailNorm}.`,
        recipient: emailNorm,
        devOtp: dispatchResult.mode !== "gmail" ? otpCode : undefined,
        mode: dispatchResult.mode,
        expiresInSeconds: 90,
      });
    } catch (err) {
      console.error("OTP send error:", err);
      res.status(500).json({ error: "Failed to dispatch OTP: " + err.message });
    }
  },
);

// Verify OTP with Attempt Throttling & Invalidation Defense
router.post("/api/otp/verify", async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    if (!email || !otp || !purpose) {
      return res.status(400).json({ error: "Email, OTP code, and purpose are required." });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const otpNorm = String(otp).trim();

    // Check active unexpired unspent OTP for this email and purpose
    const activeOtp = await Otp.findOne({
      email: emailNorm,
      purpose,
      used: 0,
      expires_at: { $gt: Date.now() },
    }).sort({ _id: -1 });

    if (!activeOtp) {
      // Check if expired
      const expiredRecord = await Otp.findOne({
        email: emailNorm,
        purpose,
        used: 0,
        expires_at: { $lte: Date.now() },
      }).sort({ _id: -1 });

      if (expiredRecord) {
        return res.status(400).json({
          error:
            "This One-Time Password code has expired (validity is 1 minute 30 seconds). Please click 'Resend OTP' to receive a fresh code.",
        });
      }

      return res.status(400).json({
        error: `No active One-Time Password found for '${emailNorm}'. Please click 'Send OTP' to request a code.`,
      });
    }

    // Verify code match
    if (activeOtp.otp !== otpNorm) {
      const newAttempts = (activeOtp.attempts || 0) + 1;
      activeOtp.attempts = newAttempts;
      await activeOtp.save();

      if (newAttempts >= 5) {
        // Invalidate OTP after 5 consecutive failures
        activeOtp.used = 1;
        await activeOtp.save();
        return res.status(429).json({
          error:
            "Too many failed One-Time Password verification attempts. This code has been invalidated for security. Please request a fresh One-Time Password.",
        });
      }

      const remaining = 5 - newAttempts;
      return res.status(400).json({
        error: `Invalid One-Time Password code for '${emailNorm}'. Attempts remaining: ${remaining}.`,
      });
    }

    // Code matched! Mark as used and update session
    activeOtp.used = 1;
    await activeOtp.save();

    if (!req.session.verifiedOtps) req.session.verifiedOtps = {};
    req.session.verifiedOtps[`${purpose}_${emailNorm}`] = Date.now();

    res.json({
      ok: true,
      verified: true,
      message: "One-Time Password successfully verified.",
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "OTP verification failed." });
  }
});

// Gmail Configuration Runtime Endpoint (Publicly accessible from login modal)
router.get("/api/config/gmail", (req, res) => {
  const activeUser = customGmailConfig.user || process.env.GMAIL_USER;
  res.json({
    isConfigured: !!(
      activeUser &&
      (customGmailConfig.pass || process.env.GMAIL_APP_PASSWORD)
    ),
    user: activeUser ? `${activeUser.substring(0, 3)}***@gmail.com` : null,
  });
});

router.post("/api/config/gmail", (req, res) => {
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
router.post("/api/config/gmail/test", async (req, res) => {
  const user = customGmailConfig.user || process.env.GMAIL_USER;
  const pass = customGmailConfig.pass || process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    return res.status(400).json({ error: "Gmail credentials are not configured yet." });
  }

  try {
    const transporter = getEmailTransporter();
    if (!transporter) throw new Error("Could not initialize transporter.");
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
router.post("/api/register", async (req, res) => {
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
    const existingPhone = await User.findOne({
      $or: [
        { phone: rawPhone },
        { phone: new RegExp(cleanPhone + "$") },
      ],
    }).lean();

    if (existingPhone) {
      return res.status(400).json({
        error: `This mobile phone number (${cleanPhone}) is already registered with '${existingPhone.company_name}'. Duplicate phone numbers cannot be registered.`,
      });
    }

    // 3. Email normalization and already registered email check
    const emailNorm = String(email).trim().toLowerCase();
    const existingEmail = await User.findOne({ email: emailNorm }).lean();
    if (existingEmail) {
      return res.status(400).json({
        error: `An enterprise account is already registered with email '${emailNorm}'. Please sign in or use a different email.`,
      });
    }

    // 4. GSTIN validation: 15 to 16 characters (standard Indian GSTIN is 15 chars)
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
    const existingGstin = await User.findOne({ registration_no: gstinNorm }).lean();
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

    // 7. Check OTP verification
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

      const record = await Otp.findOne({
        email: emailNorm,
        otp: String(otp).trim(),
        purpose: "registration",
        expires_at: { $gt: Date.now() },
      }).sort({ _id: -1 });

      if (!record) {
        const expired = await Otp.findOne({
          email: emailNorm,
          otp: String(otp).trim(),
          purpose: "registration",
          expires_at: { $lte: Date.now() },
        }).sort({ _id: -1 });

        if (expired) {
          return res.status(400).json({
            error:
              "Registration OTP has expired (validity is 1 minute 30 seconds). Please click 'Resend OTP' to receive a fresh code.",
          });
        }

        const sentElsewhere = await Otp.findOne({
          otp: String(otp).trim(),
          purpose: "registration",
          expires_at: { $gt: Date.now() },
        }).sort({ _id: -1 });

        if (sentElsewhere && sentElsewhere.email !== emailNorm) {
          return res.status(400).json({
            error: `The OTP code entered was issued for '${sentElsewhere.email}', not '${emailNorm}'. Please click 'Send OTP' to receive a fresh code at '${emailNorm}'.`,
          });
        }

        return res.status(400).json({
          error: `Invalid registration OTP code for '${emailNorm}'. Please click 'Send OTP' to receive a valid 6-digit code on this email address.`,
        });
      }

      await Otp.updateOne({ _id: record._id }, { $set: { used: 1 } });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      role: "applicant",
      email: emailNorm,
      password_hash: hash,
      company_name: companyName.trim(),
      registration_no: gstinNorm,
      phone: cleanPhone,
      district: district || "Pune",
      department: sector || "General Manufacturing",
      contact_person: contactPerson || "",
      dept_code: null,
      is_apex: 0,
      is_banned: 0,
    });

    if (req.session.verifiedOtps) {
      delete req.session.verifiedOtps[`registration_${emailNorm}`];
    }

    res.json({
      ok: true,
      id: newUser._id.toString(),
      message: "Enterprise registered successfully on Udyog Samyog.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed. Please verify input fields." });
  }
});

router.post("/api/login", loginRateLimiter.middleware(), async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm }).lean();

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid email address or password." });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `Account role mismatch. You are registered as an ${user.role}. Please select the correct tab.`,
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error("Session regeneration failure:", err);
        return res.status(500).json({ error: "Session security initialization failed." });
      }

      req.session.user = {
        id: user._id.toString(),
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
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login service encountered an issue." });
  }
});

router.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get("/api/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

router.post(
  "/api/forgot-password",
  forgotPasswordRateLimiter.middleware((req) => `${req.ip || "ip"}:${(req.body?.email || "").toLowerCase()}`),
  async (req, res) => {
    try {
      const email = String(req.body.email || "").trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Please enter a valid email address." });
      }
      const u = await User.findOne({ email }).lean();
      if (!u) {
        return res.status(404).json({
          error: `No registered account found with email '${email}'. Please verify your email or register a new enterprise profile.`,
        });
      }

      const token = crypto.randomBytes(32).toString("hex");
      await ResetToken.create({
        user_id: u._id,
        token,
        expires_at: Date.now() + 30 * 60 * 1000,
      });

      await Otp.updateMany({ email, purpose: "reset" }, { $set: { used: 1 } });

      const otp = String(crypto.randomInt(100000, 999999));
      await Otp.create({
        email,
        otp,
        purpose: "reset",
        expires_at: Date.now() + OTP_EXPIRY_MS,
        used: 0,
        attempts: 0,
      });

      const dispatch = await sendOtpEmail(email, otp, "reset");

      console.log(
        `[/api/forgot-password] Successfully issued reset OTP for ${email} (mode: ${dispatch.mode}, expires in 90s)`,
      );

      res.json({
        ok: true,
        message:
          dispatch.mode === "gmail"
            ? `Password reset One-Time Password sent to ${email} via Gmail. Check your inbox and spam folder.`
            : `Password reset One-Time Password generated. (Dev Mode: ${otp})`,
        recipient: email,
        devOtp: dispatch.mode === "gmail" ? undefined : otp,
        mode: dispatch.mode,
        expiresInSeconds: 90,
        resetUrl:
          dispatch.mode === "gmail"
            ? undefined
            : `/pages/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`,
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      res.status(500).json({ error: "Failed to initiate password reset." });
    }
  },
);

router.post("/api/test/reset-limits", (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    loginRateLimiter.reset();
    otpSendRateLimiter.reset();
    forgotPasswordRateLimiter.reset();
    return res.json({ ok: true, message: "Rate limiters reset." });
  }
  res.status(403).json({ error: "Forbidden in production environment" });
});

router.post("/api/reset-password", async (req, res) => {
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
      const row = await ResetToken.findOne({
        token,
        used: 0,
        expires_at: { $gt: Date.now() },
      });
      if (!row) {
        return res
          .status(400)
          .json({ error: "Password reset token is invalid or has expired." });
      }
      userId = row.user_id;
      row.used = 1;
      await row.save();
    } else if (email && otp) {
      const emailNorm = String(email).trim().toLowerCase();
      const isSessionVerified =
        req.session?.verifiedOtps &&
        req.session.verifiedOtps[`reset_${emailNorm}`];

      let record = null;
      if (!isSessionVerified) {
        record = await Otp.findOne({
          email: emailNorm,
          otp: String(otp).trim(),
          purpose: "reset",
          used: 0,
          expires_at: { $gt: Date.now() },
        }).sort({ _id: -1 });

        if (!record) {
          const expired = await Otp.findOne({
            email: emailNorm,
            otp: String(otp).trim(),
            purpose: "reset",
            expires_at: { $lte: Date.now() },
          }).sort({ _id: -1 });

          if (expired) {
            return res.status(400).json({
              error:
                "Password reset OTP has expired (validity is 1 minute 30 seconds). Please click 'Resend OTP' to receive a fresh code.",
            });
          }

          return res.status(400).json({
            error: `Invalid password reset OTP code for '${emailNorm}'. Please click 'Resend OTP' to receive a valid 6-digit code.`,
          });
        }
      }

      const u = await User.findOne({ email: emailNorm }).lean();
      if (!u) {
        return res.status(404).json({ error: "Enterprise user account not found." });
      }
      userId = u._id;
      if (record) {
        record.used = 1;
        await record.save();
      }
      if (req.session?.verifiedOtps) {
        delete req.session.verifiedOtps[`reset_${emailNorm}`];
      }
    } else {
      return res.status(400).json({
        error: "Either a reset token or email + OTP is required to reset password.",
      });
    }

    const hash = await bcrypt.hash(password, 10);
    await User.updateOne({ _id: userId }, { $set: { password_hash: hash } });
    res.json({
      ok: true,
      message: "Password has been successfully updated on Udyog Samyog.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password: " + err.message });
  }
});

// Fetch authenticated enterprise profile
router.get("/api/account", auth, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();
    if (!user) {
      return res.status(404).json({ error: "User account not found." });
    }

    const appCount = await Application.countDocuments({ user_id: req.session.user.id });
    const docCount = await Document.countDocuments({ user_id: req.session.user.id });

    const ret = serialize(user);
    delete ret.password_hash;
    res.json({
      ...ret,
      applicationsCount: appCount,
      documentsCount: docCount,
    });
  } catch (err) {
    console.error("Fetch profile error:", err);
    res.status(500).json({ error: "Failed to fetch account profile." });
  }
});

// Permanently Delete Own Company Account with "DELETE" confirmation
router.delete("/api/account", auth, async (req, res) => {
  try {
    const { confirmation } = req.body || {};
    const userId = toObjectId(req.session.user.id);
    const userRole = req.session.user.role;

    if (confirmation !== "DELETE") {
      return res.status(400).json({
        error:
          "Confirmation failed: You must type 'DELETE' in all capital letters to permanently delete your company account.",
      });
    }

    if (userRole !== "applicant") {
      return res.status(403).json({
        error: "Government departmental officer accounts cannot be self-deleted.",
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    const activeApps = await Application.find({
      user_id: userId,
      status: { $in: ["In Progress", "Flagged", "Approved"] },
    }).lean();

    if (activeApps.length > 0) {
      const distinctStatuses = [...new Set(activeApps.map((a) => a.status))].join(", ");
      return res.status(400).json({
        error: `Cannot delete enterprise account while statutory applications are active or approved (${distinctStatuses}). Official regulatory records must be preserved for statutory audit compliance.`,
      });
    }

    // 1. Remove physical files on disk from uploads/
    const userApps = await Application.find({ user_id: userId }, "_id").lean();
    const appIds = userApps.map((a) => a._id);

    const docs = await Document.find({
      $or: [{ user_id: userId }, { application_id: { $in: appIds } }],
    }).lean();

    docs.forEach((d) => {
      try {
        const fp = path.join(uploadsDir, d.stored_name);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
      } catch (_) {}
    });

    // 2. Cascade delete database records associated with this enterprise
    await Document.deleteMany({
      $or: [{ user_id: userId }, { application_id: { $in: appIds } }],
    });
    await Query.deleteMany({ application_id: { $in: appIds } });
    await Inspection.deleteMany({ application_id: { $in: appIds } });
    await Application.deleteMany({ user_id: userId });
    await ResetToken.deleteMany({ user_id: userId });
    await Otp.deleteMany({ email: user.email });
    await User.deleteOne({ _id: userId });

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

module.exports = router;

