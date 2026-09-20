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
    fee_breakdown:        { type: mongoose.Schema.Types.Mixed, default: null },
    internal_notes:       { type: [mongoose.Schema.Types.Mixed], default: [] },
    gis_plot:             { type: mongoose.Schema.Types.Mixed, default: null },
    sla_escalation:       { type: mongoose.Schema.Types.Mixed, default: null },
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
    annotation:     { type: mongoose.Schema.Types.Mixed, default: null },
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

/* ─── 8. Events (Append-only audit & ML history) ─────────────────── */
const eventSchema = new mongoose.Schema(
  {
    event_type:     { type: String, required: true }, // state_transition | query_raised | query_resolved | doc_upload | doc_verify | inspection | certificate_issued
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    user_id:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    officer_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    department:     String,
    from_state:     String,
    to_state:       String,
    details_json:   { type: String, default: "{}" },
    duration_ms:    Number,
    created_at:     { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(eventSchema);
const Event = mongoose.models.Event || mongoose.model("Event", eventSchema, "events");

/* ─── 9. AI Requests (Audit & Telemetry) ─────────────────────────── */
const aiRequestSchema = new mongoose.Schema(
  {
    module:         { type: String, required: true }, // advisor | form | docintel | copilot | predict | integrity | chat
    user_id:        String,
    role:           String,
    application_id: String,
    input_hash:     String,
    input_json:     String,
    output_json:    String,
    status:         { type: String, default: "ok" }, // ok | fallback | error | blocked
    engine_version: String,
    kb_version:     String,
    model_id:       String,
    prompt_version: String,
    latency_ms:     Number,
    tokens_in:      Number,
    tokens_out:     Number,
    created_at:     { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiRequestSchema);
const AiRequest = mongoose.models.AiRequest || mongoose.model("AiRequest", aiRequestSchema, "ai_requests");

/* ─── 10. AI Feedback ────────────────────────────────────────────── */
const aiFeedbackSchema = new mongoose.Schema(
  {
    request_id: { type: String, required: true },
    user_id:    { type: String, required: true },
    rating:     { type: Number, required: true }, // 1 to 5
    comment:    String,
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiFeedbackSchema);
const AiFeedback = mongoose.models.AiFeedback || mongoose.model("AiFeedback", aiFeedbackSchema, "ai_feedback");

/* ─── 11. AI Document Extractions ───────────────────────────────── */
const aiDocumentExtractionSchema = new mongoose.Schema(
  {
    document_id:           { type: mongoose.Schema.Types.ObjectId, ref: "Document", required: true },
    application_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    doc_type:              String,
    doc_type_confidence:   Number,
    fields_json:           { type: String, default: "{}" },
    field_confidence_json: { type: String, default: "{}" },
    ocr_engine:            String,
    status:                { type: String, default: "extracted" }, // pending | extracted | needs_review | confirmed | rejected
    reviewed_by:           String,
    reviewed_at:           String,
    created_at:            { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiDocumentExtractionSchema);
const AiDocumentExtraction =
  mongoose.models.AiDocumentExtraction ||
  mongoose.model("AiDocumentExtraction", aiDocumentExtractionSchema, "ai_document_extractions");

/* ─── 12. AI Flags (Integrity & Anomaly Detection) ───────────────── */
const aiFlagSchema = new mongoose.Schema(
  {
    application_id: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true },
    type:           { type: String, required: true }, // duplicate_doc | data_inconsistency | tampering_hint | outlier | certificate_anomaly
    severity:       { type: String, default: "medium" }, // low | medium | high
    evidence_json:  { type: String, default: "{}" },
    status:         { type: String, default: "open" }, // open | dismissed | confirmed
    reviewed_by:    String,
    resolution:     String,
    created_at:     { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiFlagSchema);
const AiFlag = mongoose.models.AiFlag || mongoose.model("AiFlag", aiFlagSchema, "ai_flags");

/* ─── 13. AI Officer Actions (Copilot feedback tracking) ─────────── */
const aiOfficerActionSchema = new mongoose.Schema(
  {
    request_id:    String,
    officer_id:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    application_id:{ type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    action:        { type: String, required: true }, // accepted | edited | rejected
    edited_output: String,
    created_at:    { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiOfficerActionSchema);
const AiOfficerAction =
  mongoose.models.AiOfficerAction ||
  mongoose.model("AiOfficerAction", aiOfficerActionSchema, "ai_officer_actions");

/* ─── 14. AI Kill Switches & Ops Toggles ─────────────────────────── */
const aiKillSwitchSchema = new mongoose.Schema(
  {
    module:     { type: String, required: true, unique: true }, // global | advisor | form | docintel | copilot | predict | integrity | chat
    enabled:    { type: Boolean, default: true },
    updated_by: String,
    reason:     String,
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: false }
);
addIdTransform(aiKillSwitchSchema);
const AiKillSwitch =
  mongoose.models.AiKillSwitch ||
  mongoose.model("AiKillSwitch", aiKillSwitchSchema, "ai_kill_switches");

/* ─── DB Connection ──────────────────────────────────────────────── */
async function connectDB(uri) {
  const MONGO_URI = uri || process.env.MONGODB_URI || "mongodb://localhost:27017/udyog_samyog";
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 8000,
  });
  console.log(`[MongoDB] Connected to ${MONGO_URI.replace(/\/\/.*@/, "//***@")}`);
}

module.exports = {
  connectDB,
  User,
  ResetToken,
  Otp,
  Application,
  Document,
  Query,
  Inspection,
  Event,
  AiRequest,
  AiFeedback,
  AiDocumentExtraction,
  AiFlag,
  AiOfficerAction,
  AiKillSwitch,
};


