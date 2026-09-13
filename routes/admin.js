"use strict";
const express = require("express");
const router = express.Router();
const { User } = require("../db/models");
const { auth, apexOfficial, serialize, toObjectId } = require("../utils/helpers");

// List all enterprises for Apex Officer scrutiny
router.get("/api/admin/enterprises", auth, apexOfficial, async (req, res) => {
  try {
    const rows = await User.aggregate([
      { $match: { role: "applicant" } },
      {
        $lookup: {
          from: "applications",
          localField: "_id",
          foreignField: "user_id",
          as: "apps",
        },
      },
      {
        $project: {
          company_name: 1,
          registration_no: 1,
          email: 1,
          phone: 1,
          district: 1,
          contact_person: 1,
          is_banned: 1,
          ban_reason: 1,
          banned_at: 1,
          created_at: 1,
          applications_count: { $size: "$apps" },
        },
      },
      { $sort: { created_at: -1 } },
    ]);
    res.json(serialize(rows));
  } catch (err) {
    console.error("Error fetching enterprises:", err);
    res.status(500).json({ error: "Failed to load enterprises" });
  }
});

// Ban / Blacklist Enterprise from future approvals and permits
router.post("/api/admin/enterprises/:id/ban", auth, apexOfficial, async (req, res) => {
  try {
    const userId = toObjectId(req.params.id);
    if (!userId) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    const { reason } = req.body;
    const target = await User.findOne({ _id: userId, role: "applicant" }).lean();
    if (!target) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: "Statutory reason for blacklisting is required." });
    }

    const banReason = String(reason).trim();
    const bannedAt = new Date().toISOString();

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_banned: 1,
          ban_reason: banReason,
          banned_at: bannedAt,
        },
      },
    );

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
router.post("/api/admin/enterprises/:id/unban", auth, apexOfficial, async (req, res) => {
  try {
    const userId = toObjectId(req.params.id);
    if (!userId) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    const target = await User.findOne({ _id: userId, role: "applicant" }).lean();
    if (!target) {
      return res.status(404).json({ error: "Enterprise account not found." });
    }

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          is_banned: 0,
          ban_reason: null,
          banned_at: null,
        },
      },
    );

    res.json({
      ok: true,
      message: `Enterprise '${target.company_name}' account has been reinstated.`,
    });
  } catch (err) {
    console.error("Error unbanning enterprise:", err);
    res.status(500).json({ error: "Failed to reinstate enterprise" });
  }
});

module.exports = router;

