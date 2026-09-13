"use strict";
/**
 * Udyog Samyog — Mongoose Models
 * All 6 collections mirroring the original SQLite schema.
 * Each schema applies a toJSON transform that exposes `id` (string of _id)
 * so existing API consumers see the same shape they got from SQLite.
 */
const mongoose = require("mongoose");

/* ─── Shared toJSON transform ────────────────────────────────────── */
function addIdTransform(schema) {
  schema.set("toJSON", {
    virtuals: true,
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
  schema.set("toObject", { virtuals: true });
}

/* ─── 1. Users ───────────────────────────────────────────────────── */
const userSchema = new mongoose.Schema(
  {
    role:           { type: String, required: true },
    email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash:  { type: String, required: true },
    company_name:   String,
    registration_no:String,
    phone:          String,
    department:     String,
    contact_person: String,
    district:       String,
    dept_code:      String,
    is_apex:        { type: Number, default: 0 },
    is_banned:      { type: Number, default: 0 },
    ban_reason:     String,
    banned_at:      String,
    created_at:     { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(userSchema);
const User = mongoose.models.User || mongoose.model("User", userSchema, "users");

/* ─── 2. Reset Tokens ────────────────────────────────────────────── */
const resetTokenSchema = new mongoose.Schema(
  {
    user_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token:      { type: String, required: true, unique: true },
    expires_at: { type: Number, required: true },
    used:       { type: Number, default: 0 },
  },
  { timestamps: false }
);
addIdTransform(resetTokenSchema);
const ResetToken = mongoose.models.ResetToken || mongoose.model("ResetToken", resetTokenSchema, "reset_tokens");

/* ─── 3. OTPs ────────────────────────────────────────────────────── */
const otpSchema = new mongoose.Schema(
  {
    email:      { type: String, required: true, lowercase: true, trim: true },
    otp:        { type: String, required: true },
    purpose:    { type: String, required: true },
    expires_at: { type: Number, required: true },
    used:       { type: Number, default: 0 },
    attempts:   { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(otpSchema);
const Otp = mongoose.models.Otp || mongoose.model("Otp", otpSchema, "otps");

/* ─── 4. Applications ────────────────────────────────────────────── */
const applicationSchema = new mongoose.Schema(
  {
    user_id:              { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    application_no:       { type: String, unique: true, required: true },
    company_name:         String,
    registration_no:      String,
    industry_category:    String,
    land_size:            Number,
    water_use:            Number,
    electricity:          Number,
    hazardous:            { type: Number, default: 0 },
    hazard_level:         { type: String, default: "Low Risk" },
    location:             String,
    district:             String,
    project_cost:         { type: Number, default: 0 },
    employment_potential: { type: Number, default: 0 },
    msme_category:        { type: String, default: "Small" },
    risk_tier:            { type: String, default: "Green" },
    status:               { type: String, default: "In Progress" },
    clearances_json:      { type: String, default: "[]" },
    parallel_status_json: { type: String, default: "{}" },
    current_stage:        { type: String, default: "mpcb" },
    stage_statuses:       { type: String, default: "{}" },
    created_at:           { type: String, default: () => new Date().toISOString() },
    updated_at:           { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(applicationSchema);
const Application = mongoose.models.Application || mongoose.model("Application", applicationSchema, "applications");

/* ─── 5. Documents ───────────────────────────────────────────────── */
const documentSchema = new mongoose.Schema(
  {
    application_id:     { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    user_id:            { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    document_type:      String,
    original_name:      String,
    stored_name:        String,
    mime_type:          String,
    size:               Number,
    verification_status:{ type: String, default: "Pending" },
    officer_remarks:    String,
    plan_type:          String,
    department:         String,
    created_at:         { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(documentSchema);
const Document = mongoose.models.Document || mongoose.model("Document", documentSchema, "documents");

/* ─── 6. Queries ─────────────────────────────────────────────────── */
const querySchema = new mongoose.Schema(
  {
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    officer_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message:        { type: String, required: true },
    applicant_reply:String,
    reply_file_id:  mongoose.Schema.Types.ObjectId,
    reply_file_name:String,
    status:         { type: String, default: "Open" },
    created_at:     { type: String, default: () => new Date().toISOString() },
    resolved_at:    String,
  },
  { timestamps: false }
);
addIdTransform(querySchema);
const Query = mongoose.models.Query || mongoose.model("Query", querySchema, "queries");

/* ─── 7. Inspections ─────────────────────────────────────────────── */
const inspectionSchema = new mongoose.Schema(
  {
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    officer_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    department:     { type: String, required: true },
    scheduled_date: { type: String, required: true },
    inspector_name: String,
    status:         { type: String, default: "Scheduled" },
    notes:          String,
    created_at:     { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(inspectionSchema);
const Inspection = mongoose.models.Inspection || mongoose.model("Inspection", inspectionSchema, "inspections");

/* ─── DB Connection ──────────────────────────────────────────────── */
async function connectDB(uri) {
  const MONGO_URI = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/udyog_samyog";
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`[MongoDB] Connected to ${MONGO_URI.replace(/\/\/.*@/, "//***@")}`);
}

module.exports = { connectDB, User, ResetToken, Otp, Application, Document, Query, Inspection };

