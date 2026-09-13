"use strict";
const express = require("express");
const router = express.Router();
const fs = require("fs");
const { User, Application, Document, Query } = require("../db/models");
const { auth, official, upload, toObjectId } = require("../utils/helpers");

// Officer Raises Query
router.post("/api/applications/:id/query", auth, official, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Query message cannot be blank." });
    }

    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found." });

    const appRow = await Application.findById(appId, "status").lean();
    if (!appRow) {
      return res.status(404).json({ error: "Application not found." });
    }
    if (appRow.status === "Approved" || appRow.status === "Rejected") {
      return res.status(400).json({
        error: `Cannot raise queries on an application that is already ${appRow.status}.`,
      });
    }

    await Query.create({
      application_id: appId,
      officer_id: req.session.user.id,
      message: message.trim(),
      status: "Open",
      created_at: new Date().toISOString(),
    });

    await Application.updateOne(
      { _id: appId },
      {
        $set: {
          status: "Flagged",
          updated_at: new Date().toISOString(),
        },
      },
    );

    res.json({
      ok: true,
      message: "Query raised. Applicant notified for clarification.",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to record query" });
  }
});

// Applicant Responds to Query
router.post(
  "/api/queries/:id/reply",
  auth,
  upload.single("revisedDocument"),
  async (req, res) => {
    try {
      const queryId = toObjectId(req.params.id);
      if (!queryId) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res.status(404).json({ error: "Query not found" });
      }

      const { reply } = req.body;

      const user = await User.findById(req.session.user.id, "is_banned ban_reason").lean();
      if (user && user.is_banned) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res.status(403).json({
          error: `Your enterprise account has been blacklisted and banned. Reason: ${user.ban_reason || "Statutory non-compliance"}.`,
        });
      }

      const q = await Query.findById(queryId).lean();
      if (!q) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res.status(404).json({ error: "Query not found" });
      }

      if (q.status === "Resolved") {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res.status(400).json({ error: "This query has already been resolved." });
      }

      const a = await Application.findById(q.application_id, "user_id").lean();
      if (!a) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res.status(404).json({ error: "Associated application not found" });
      }

      if (
        req.session.user.role !== "official" &&
        a.user_id.toString() !== req.session.user.id
      ) {
        if (req.file) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
        return res
          .status(403)
          .json({ error: "Unauthorized to reply to this query" });
      }

      let fileId = null;
      let fileName = null;

      if (req.file) {
        fileName = req.file.originalname;
        const officerUser = await User.findById(q.officer_id, "dept_code").lean();
        const targetDept = officerUser ? officerUser.dept_code : null;

        const docInfo = await Document.create({
          application_id: q.application_id,
          user_id: req.session.user.id,
          document_type: "Revised Compliance Document",
          original_name: req.file.originalname,
          stored_name: req.file.filename,
          mime_type: req.file.mimetype,
          size: req.file.size,
          verification_status: "Pending",
          officer_remarks: "Uploaded in response to query",
          plan_type: "supporting_doc",
          department: targetDept,
          created_at: new Date().toISOString(),
        });
        fileId = docInfo._id;
      }

      await Query.updateOne(
        { _id: queryId },
        {
          $set: {
            applicant_reply: reply || "Revised document and clarifications submitted.",
            reply_file_id: fileId,
            reply_file_name: fileName,
            status: "Resolved",
            resolved_at: new Date().toISOString(),
          },
        },
      );

      const openQueries = await Query.countDocuments({
        application_id: q.application_id,
        status: "Open",
      });

      if (openQueries === 0) {
        await Application.updateOne(
          { _id: q.application_id, status: "Flagged" },
          {
            $set: {
              status: "In Progress",
              updated_at: new Date().toISOString(),
            },
          },
        );
      }

      res.json({ ok: true, message: "Clarification submitted successfully." });
    } catch (err) {
      console.error("Error replying to query:", err);
      res.status(500).json({ error: "Failed to record reply: " + err.message });
    }
  },
);

module.exports = router;

