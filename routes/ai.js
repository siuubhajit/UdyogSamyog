"use strict";
/**
 * Udyog Samyog — Express AI Bridge Routes
 * Connects frontend clients to the AI Client with Circuit Breaker, HMAC signing, and fallbacks.
 */
const express = require("express");
const router = express.Router();
const aiClient = require("../utils/aiClient");
const { auth, official, apexOfficial, toObjectId } = require("../utils/helpers");
const { Application, Document, Query, AiDocumentExtraction, AiFeedback } = require("../db/models");

function adminOnly(req, res, next) {
  if (!req.session.user || (req.session.user.role !== "admin" && !req.session.user.isApex)) {
    return res.status(403).json({ error: "Access restricted to administrators and apex authority." });
  }
  next();
}

// ── Module A: Advisor ─────────────────────────────────────────

router.post("/api/ai/advisor/advise", async (req, res) => {
  try {
    const user = req.session?.user || null;
    const result = await aiClient.getAdvice(req.body, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/advisor/whatif", async (req, res) => {
  try {
    const user = req.session?.user || null;
    const { profile, changes } = req.body;
    const result = await aiClient.getWhatIf(profile || {}, changes || {}, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module B: Smart Form ──────────────────────────────────────

router.post("/api/ai/form/suggest", auth, async (req, res) => {
  try {
    const appData = req.body.application || req.body;
    const result = await aiClient.getFormSuggestions(appData, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/form/completeness", auth, async (req, res) => {
  try {
    const appData = req.body.application || {};
    const docs = req.body.documents || [];
    const result = await aiClient.checkCompleteness(appData, docs, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module C: Document Intelligence ───────────────────────────

router.post("/api/ai/docs/process", auth, async (req, res) => {
  try {
    const { document_id, file_path, doc_type } = req.body;
    const result = await aiClient.processDocument(document_id, file_path, doc_type, req.session.user);
    
    // Also mirror extraction in MongoDB if document exists
    if (result && result.fields) {
      try {
        await AiDocumentExtraction.findOneAndUpdate(
          { document_id: toObjectId(document_id) || document_id },
          {
            document_id: toObjectId(document_id) || document_id,
            doc_type: result.doc_type || doc_type || "Document",
            extracted_fields: result.fields,
            field_confidences: result.field_confidences || {},
            review_status: result.status || "needs_review",
            raw_extraction_output: result,
          },
          { upsert: true, new: true }
        );
      } catch (_) {}
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/ai/docs/:id/extraction", auth, async (req, res) => {
  try {
    const result = await aiClient.getDocExtraction(req.params.id, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/docs/:id/confirm", auth, async (req, res) => {
  try {
    const { confirmed_fields } = req.body;
    const result = await aiClient.confirmDocExtraction(req.params.id, confirmed_fields, req.session.user);
    
    // Update local DB extraction record
    try {
      await AiDocumentExtraction.findOneAndUpdate(
        { document_id: toObjectId(req.params.id) || req.params.id },
        {
          confirmed_fields: confirmed_fields || {},
          review_status: "confirmed",
          reviewed_by: toObjectId(req.session.user._id || req.session.user.id),
          reviewed_at: new Date(),
        }
      );
    } catch (_) {}

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module D: Officer Copilot ─────────────────────────────────

router.post("/api/ai/copilot/brief", official, async (req, res) => {
  try {
    let app = req.body.application;
    let docs = req.body.documents || [];
    let queries = req.body.queries || [];

    // If application_id is provided, load fresh from database
    if (req.body.application_id) {
      const dbApp = await Application.findById(toObjectId(req.body.application_id));
      if (dbApp) {
        app = dbApp.toObject();
        const dbDocs = await Document.find({ application_id: dbApp._id });
        docs = dbDocs.map((d) => d.toObject());
        const dbQueries = await Query.find({ application_id: dbApp._id });
        queries = dbQueries.map((q) => q.toObject());
      }
    }

    const result = await aiClient.getCopilotBrief(app || {}, docs, queries, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/copilot/draft-query", official, async (req, res) => {
  try {
    const { application, missing_items } = req.body;
    const result = await aiClient.draftDeficiencyNotice(application || {}, missing_items || [], req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/copilot/similar", official, async (req, res) => {
  try {
    const { application } = req.body;
    const result = await aiClient.getSimilarCases(application || {}, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module E: Prediction & Analytics ──────────────────────────

router.post("/api/ai/predict/timeline", auth, async (req, res) => {
  try {
    const appData = req.body.application || req.body;
    const result = await aiClient.predictTimeline(appData, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/predict/query-risk", auth, async (req, res) => {
  try {
    const { application, completeness } = req.body;
    const result = await aiClient.predictQueryRisk(application || {}, completeness || null, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module F: Integrity & Verification ────────────────────────

router.post("/api/ai/integrity/scan", official, async (req, res) => {
  try {
    const { application, documents } = req.body;
    const result = await aiClient.scanIntegrity(application || {}, documents || [], req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/integrity/verify-certificate", async (req, res) => {
  try {
    const { application_no, certificate_hash } = req.body;
    const user = req.session?.user || null;
    const result = await aiClient.verifyCertificate(application_no, certificate_hash, user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Module G & H: Chat Assistant ──────────────────────────────

router.post("/api/ai/chat", async (req, res) => {
  try {
    const user = req.session?.user || null;
    const { message, conversation_id, language } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }
    const result = await aiClient.sendChatMessage(message, conversation_id, user, language || "en");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/chat/stream", async (req, res) => {
  try {
    const user = req.session?.user || null;
    const { message, conversation_id, language } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    await aiClient.streamChatMessage(message, conversation_id, user, language || "en", (chunk) => {
      res.write(chunk);
    });
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
      res.end();
    }
  }
});

// ── Module I: Admin & Operations Center ───────────────────────

router.get("/api/ai/admin/metrics", adminOnly, async (req, res) => {
  try {
    const result = await aiClient.getAdminMetrics(req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/ai/admin/toggles", adminOnly, async (req, res) => {
  try {
    const result = await aiClient.getAdminToggles(req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/admin/toggles", adminOnly, async (req, res) => {
  try {
    const { module: moduleName, enabled, reason } = req.body;
    const result = await aiClient.updateAdminToggle(moduleName, enabled, reason, req.session.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/ai/feedback", async (req, res) => {
  try {
    const { request_id, rating, comment } = req.body;
    const user = req.session?.user || null;
    const result = await aiClient.submitFeedback(request_id, rating, comment, user);
    
    // Save in Mongo AiFeedback
    try {
      await AiFeedback.create({
        request_id,
        user_id: user ? toObjectId(user._id || user.id) : null,
        user_role: user?.role || "anonymous",
        rating: Number(rating) || 5,
        comment: comment || "",
      });
    } catch (_) {}

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

