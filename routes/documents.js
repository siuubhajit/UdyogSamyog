"use strict";
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { User, Application, Document } = require("../db/models");
const {
  uploadsDir,
  upload,
  auth,
  official,
  determinePlanType,
  getDocumentDepartment,
  serialize,
  toObjectId,
  emitEvent,
} = require("../utils/helpers");

// Document Upload
router.post(
  "/api/applications/:id/documents",
  auth,
  upload.single("document"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ error: "Please choose a valid PDF, JPG, or PNG document." });
      }

      const appId = toObjectId(req.params.id);
      if (!appId) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res.status(404).json({ error: "Application not found" });
      }

      const a = await Application.findById(appId).lean();
      if (!a) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res.status(404).json({ error: "Application not found" });
      }

      if (
        req.session.user.role !== "official" &&
        a.user_id.toString() !== req.session.user.id
      ) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (_) {}
        }
        return res
          .status(403)
          .json({ error: "Not authorized to upload to this application." });
      }

      if (req.session.user.role === "applicant") {
        const u = await User.findById(
          req.session.user.id,
          "is_banned ban_reason",
        ).lean();
        if (u && u.is_banned) {
          if (req.file) {
            try {
              fs.unlinkSync(req.file.path);
            } catch (_) {}
          }
          return res.status(403).json({
            error: `Your enterprise account has been blacklisted: ${u.ban_reason || "Statutory non-compliance"}. Document uploads are prohibited.`,
          });
        }
      }

      const planType = determinePlanType(
        req.body.documentType,
        req.body.planType,
      );
      const department = getDocumentDepartment({
        plan_type: planType,
        document_type: req.body.documentType,
        original_name: req.file.originalname,
      });

      const newDoc = await Document.create({
        application_id: a._id,
        user_id: req.session.user.id,
        document_type: req.body.documentType || "Other Mandatory Document",
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        mime_type: req.file.mimetype,
        size: req.file.size,
        verification_status: "Pending",
        plan_type: planType,
        department,
        created_at: new Date().toISOString(),
      });

      emitEvent({
        event_type: "doc_upload",
        application_id: a._id,
        user_id: req.session.user.id,
        department,
        details: {
          document_id: newDoc._id,
          document_type: newDoc.document_type,
          plan_type: planType,
          original_name: req.file.originalname,
          size: req.file.size,
          mime_type: req.file.mimetype,
        },
      });

      res.json({
        ok: true,
        id: newDoc._id.toString(),
        originalName: req.file.originalname,
        documentType: req.body.documentType,
        planType,
        department,
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

// List Application Documents
router.get("/api/applications/:id/documents", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId, "user_id").lean();
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Forbidden" });
    }

    let docs = await Document.find({ application_id: appId })
      .sort({ created_at: 1 })
      .lean();

    if (req.session.user.role === "official") {
      const isApex =
        req.session.user.isApex ||
        req.session.user.deptCode === "msins" ||
        req.session.user.email === "officer@udyog.gov.in";
      if (!isApex) {
        const officerDept = req.session.user.deptCode;
        docs = docs.filter((d) => {
          const dept = d.department || getDocumentDepartment(d);
          return dept === officerDept;
        });
      }
    }

    res.json(serialize(docs));
  } catch (err) {
    res.status(500).json({ error: "Failed to list documents" });
  }
});

// Inline Document Preview
router.get("/api/documents/:id/view", auth, async (req, res) => {
  try {
    const docId = toObjectId(req.params.id);
    if (!docId) return res.status(404).send("Document not found in vault.");

    const d = await Document.findById(docId).lean();
    if (!d) return res.status(404).send("Document not found in vault.");

    const a = await Application.findById(d.application_id, "user_id").lean();
    if (!a) return res.status(404).send("Associated application not found.");

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res
        .status(403)
        .send("Access Denied: You do not possess clearance for this document.");
    }

    if (req.session.user.role === "official") {
      const isApex =
        req.session.user.isApex ||
        req.session.user.deptCode === "msins" ||
        req.session.user.email === "officer@udyog.gov.in";
      if (!isApex) {
        const officerDept = req.session.user.deptCode;
        const docDept = d.department || getDocumentDepartment(d);
        if (docDept && docDept !== officerDept) {
          return res
            .status(403)
            .send(
              "Access Denied: Departmental restriction. You can only inspect documents assigned to your department vault.",
            );
        }
      }
    }

    const safeStoredName = path.basename(d.stored_name || "");
    const resolvedPath = path.resolve(uploadsDir, safeStoredName);
    const normalizedUploads = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(normalizedUploads + path.sep)) {
      return res.status(400).send("Invalid document path in vault.");
    }

    if (!fs.existsSync(resolvedPath)) {
      return res
        .status(404)
        .send("Physical file is missing from the server vault.");
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", d.mime_type || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(d.original_name)}"`,
    );
    fs.createReadStream(resolvedPath).pipe(res);
  } catch (e) {
    res.status(500).send("Document preview error: " + e.message);
  }
});

// Download Attachment
router.get("/api/documents/:id", auth, async (req, res) => {
  try {
    const docId = toObjectId(req.params.id);
    if (!docId) return res.status(404).json({ error: "Document not found" });

    const d = await Document.findById(docId).lean();
    if (!d) return res.status(404).json({ error: "Document not found" });

    const a = await Application.findById(d.application_id, "user_id").lean();
    if (
      req.session.user.role !== "official" &&
      a &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (req.session.user.role === "official") {
      const isApex =
        req.session.user.isApex ||
        req.session.user.deptCode === "msins" ||
        req.session.user.email === "officer@udyog.gov.in";
      if (!isApex) {
        const officerDept = req.session.user.deptCode;
        const docDept = d.department || getDocumentDepartment(d);
        if (docDept && docDept !== officerDept) {
          return res.status(403).json({
            error:
              "Access Denied: Departmental restriction. You cannot download documents outside your department vault.",
          });
        }
      }
    }

    const safeStoredName = path.basename(d.stored_name || "");
    const resolvedPath = path.resolve(uploadsDir, safeStoredName);
    const normalizedUploads = path.resolve(uploadsDir);

    if (!resolvedPath.startsWith(normalizedUploads + path.sep)) {
      return res.status(400).json({ error: "Invalid document path in vault." });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.download(resolvedPath, d.original_name);
  } catch (err) {
    res.status(500).json({ error: "Download failed" });
  }
});

// Document Optical Character Recognition & Extraction (OCR)
router.post("/api/documents/:id/ocr", auth, async (req, res) => {
  try {
    const docId = toObjectId(req.params.id);
    if (!docId)
      return res.status(404).json({ error: "Document not found in vault." });

    const d = await Document.findById(docId).lean();
    if (!d)
      return res.status(404).json({ error: "Document not found in vault." });

    const aiClient = require("../utils/aiClient");
    const result = await aiClient.processDocument(
      d._id.toString(),
      d.stored_name,
      d.document_type || d.plan_type,
      req.session.user,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "OCR extraction failed: " + err.message });
  }
});

// Officer Document Verification
router.patch("/api/documents/:id/verify", auth, official, async (req, res) => {
  try {
    const docId = toObjectId(req.params.id);
    if (!docId) return res.status(404).json({ error: "Document not found" });

    const { status, remarks } = req.body;
    const d = await Document.findById(docId).lean();
    if (!d) return res.status(404).json({ error: "Document not found" });

    const appRow = await Application.findById(
      d.application_id,
      "status",
    ).lean();
    if (
      appRow &&
      (appRow.status === "Approved" || appRow.status === "Rejected")
    ) {
      return res.status(400).json({
        error: `Application is already ${appRow.status}. Document scrutiny is locked.`,
      });
    }

    const isApex =
      req.session.user.isApex ||
      req.session.user.deptCode === "msins" ||
      req.session.user.email === "officer@udyog.gov.in";
    if (!isApex) {
      const officerDept = req.session.user.deptCode;
      const docDept = d.department || getDocumentDepartment(d);
      if (docDept && docDept !== officerDept) {
        return res.status(403).json({
          error:
            "Access Denied: You cannot verify or modify scrutiny on documents outside your department.",
        });
      }
    }

    await Document.updateOne(
      { _id: docId },
      {
        $set: {
          verification_status: status || "Verified",
          officer_remarks: remarks || "",
        },
      },
    );

    emitEvent({
      event_type: "doc_verify",
      application_id: d.application_id,
      officer_id: req.session.user.id,
      department: req.session.user.deptCode,
      from_state: d.verification_status,
      to_state: status || "Verified",
      details: {
        document_id: docId,
        document_type: d.document_type,
        remarks: remarks || "",
      },
    });

    res.json({ ok: true, message: "Document scrutiny updated." });
  } catch (err) {
    res.status(500).json({ error: "Failed to update document status" });
  }
});

module.exports = router;
