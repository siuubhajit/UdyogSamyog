"use strict";
const express = require("express");
const router = express.Router();
const { Application, Inspection } = require("../db/models");
const { auth, official, serialize, toObjectId } = require("../utils/helpers");

// Schedule Inspection
router.post("/api/applications/:id/inspections", auth, official, async (req, res) => {
  try {
    const { department, scheduledDate, inspectorName, notes } = req.body;
    if (!department || !scheduledDate) {
      return res
        .status(400)
        .json({ error: "Department and Inspection Date are required." });
    }

    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found." });

    const appRow = await Application.findById(appId, "status").lean();
    if (!appRow) {
      return res.status(404).json({ error: "Application not found." });
    }
    if (appRow.status === "Approved" || appRow.status === "Rejected") {
      return res.status(400).json({
        error: `Cannot schedule inspections for an application that is already ${appRow.status}.`,
      });
    }

    await Inspection.create({
      application_id: appId,
      officer_id: req.session.user.id,
      department,
      scheduled_date: scheduledDate,
      inspector_name: inspectorName || "Senior Divisional Officer",
      notes: notes || "Joint on-site compliance verification",
      status: "Scheduled",
      created_at: new Date().toISOString(),
    });

    res.json({ ok: true, message: "Joint on-site inspection scheduled." });
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule inspection" });
  }
});

// List Inspections
router.get("/api/applications/:id/inspections", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId, "user_id").lean();
    if (!a) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Access Denied: You do not own this application." });
    }

    const list = await Inspection.find({ application_id: appId })
      .sort({ scheduled_date: 1 })
      .lean();

    res.json(serialize(list));
  } catch (err) {
    res.status(500).json({ error: "Failed to list inspections" });
  }
});

module.exports = router;

