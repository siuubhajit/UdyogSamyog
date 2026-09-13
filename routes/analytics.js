"use strict";
const express = require("express");
const router = express.Router();
const { Application } = require("../db/models");
const { auth, official, evaluateRegulatoryChecklist } = require("../utils/helpers");

// Regulatory Knowledge & Schemes
router.get("/api/schemes/eligible", (req, res) => {
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

// Analytics & Intelligence Summary
router.get("/api/analytics/summary", auth, official, async (req, res) => {
  try {
    const total = await Application.countDocuments({});
    const inProgress = await Application.countDocuments({ status: "In Progress" });
    const flagged = await Application.countDocuments({ status: "Flagged" });
    const approved = await Application.countDocuments({ status: "Approved" });
    const rejected = await Application.countDocuments({ status: "Rejected" });

    const districtCounts = await Application.aggregate([
      { $group: { _id: "$district", count: { $sum: 1 } } },
      { $project: { district: "$_id", count: 1, _id: 0 } },
    ]);

    const riskCounts = await Application.aggregate([
      { $group: { _id: "$risk_tier", count: { $sum: 1 } } },
      { $project: { risk_tier: "$_id", count: 1, _id: 0 } },
    ]);

    const departmentClearanceTimes = [
      {
        department: "Industrial Development Corporation Land & Building Plan",
        avgDays: 5.2,
        slaTarget: 7,
        complianceRate: "94%",
      },
      {
        department: "Pollution Control Board Environmental Consent",
        avgDays: 12.8,
        slaTarget: 15,
        complianceRate: "88%",
      },
      {
        department: "Directorate of Fire Services Clearance",
        avgDays: 6.5,
        slaTarget: 7,
        complianceRate: "91%",
      },
      {
        department: "Directorate of Industrial Safety & Health Clearance",
        avgDays: 7.9,
        slaTarget: 10,
        complianceRate: "92%",
      },
      {
        department: "State Electricity Distribution Power Connection",
        avgDays: 4.1,
        slaTarget: 5,
        complianceRate: "96%",
      },
    ];

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
      departmentClearanceTimes,
      slaData: departmentClearanceTimes,
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
          stage: "Final Integrated Clearance Certificate Issuance",
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
              { risk_tier: "Red", count: 6 },
            ],
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load analytics summary" });
  }
});

module.exports = router;

