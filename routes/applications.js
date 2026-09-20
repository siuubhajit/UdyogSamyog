"use strict";
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { User, Application, Document, Query, Inspection } = require("../db/models");
const {
  auth,
  official,
  evaluateRegulatoryChecklist,
  getDocumentDepartment,
  serialize,
  toObjectId,
  emitEvent,
} = require("../utils/helpers");
const { calculateStatutoryFees } = require("../utils/challanGenerator");
const { evaluateApplicationSla } = require("../utils/slaMonitor");

const PIPELINE_STAGES = ["mpcb", "parallel_scrutiny", "msins"];
const STAGE_LABELS = {
  mpcb: "Maharashtra Pollution Control Board · Environmental Review",
  midc: "Maharashtra Industrial Development Corporation · Civil & Infrastructure",
  dish: "Directorate of Industrial Safety & Health · Factory Safety",
  fire: "Directorate of Maharashtra Fire Services · Life Safety Clearance Certificate",
  parallel_scrutiny:
    "Simultaneous Departmental Scrutiny (Civil Infrastructure, Factory Safety, Fire Services)",
  msins:
    "Department Officer - Apex Authority (Maharashtra State Innovation Society / Industries Department)",
};

// Create Application
router.post("/api/applications", auth, async (req, res) => {
  try {
    if (req.session.user.role !== "applicant") {
      return res.status(403).json({
        error:
          "Access Denied: Only registered enterprise applicants can submit statutory clearance applications.",
      });
    }

    const user = await User.findById(req.session.user.id).lean();
    if (user && user.is_banned) {
      return res.status(403).json({
        error: `Your enterprise account has been blacklisted and banned from future statutory clearances by order of Directorate of Industries & State Innovation Society. Reason: ${user.ban_reason || "Statutory non-compliance"}.`,
      });
    }

    const {
      industryCategory,
      landSize,
      waterUse,
      electricity,
      hazardous,
      hazardLevel: rawHazardLevel,
      location,
      district,
      projectCost,
      employmentPotential,
    } = req.body;

    const hazardLevel =
      rawHazardLevel ||
      (hazardous ? "Chemical Hazard (High Risk)" : "Low Risk / General");

    const evaluation = evaluateRegulatoryChecklist({
      industryCategory,
      landSize,
      waterUse,
      electricity,
      hazardous,
      projectCost,
    });

    const seq = String(Date.now()).slice(-5);
    const appNo = `MH/UDYOG/2026/${seq}`;

    const parallelStatus = {
      mpcb: {
        status:
          evaluation.riskTier === "Red"
            ? "In-depth Scrutiny"
            : "Under Scrutiny",
        phase: 1,
        remarks:
          "Phase 1: Environmental Plan & Effluent Scheme pending review by Environment Officer (Pollution Control Board)",
        updated: new Date().toISOString(),
      },
      midc: {
        status: "Waiting for Environmental Clearance",
        phase: 2,
        remarks:
          "Civil infrastructure plan queued for Phase 2 simultaneous scrutiny",
        updated: new Date().toISOString(),
      },
      dish: {
        status: "Waiting for Environmental Clearance",
        phase: 2,
        remarks: `Factory safety plan (${hazardLevel}) queued for Phase 2 simultaneous scrutiny`,
        updated: new Date().toISOString(),
      },
      fire: {
        status: "Waiting for Environmental Clearance",
        phase: 2,
        remarks:
          "Fire protection & life safety plan queued for Phase 2 simultaneous scrutiny",
        updated: new Date().toISOString(),
      },
      msins: {
        status: "Pending Department Clearances",
        phase: 3,
        remarks:
          "Final single-window consolidated sanction awaiting departmental clearances",
        updated: new Date().toISOString(),
      },
    };

    const newApp = await Application.create({
      user_id: user._id,
      application_no: appNo,
      company_name:
        req.body.companyName ||
        user?.company_name ||
        req.session.user.companyName ||
        "Industrial Unit",
      registration_no:
        req.body.registrationNo ||
        user?.registration_no ||
        req.session.user.registrationNo ||
        "GSTIN-PENDING",
      industryCategory: industryCategory || "Light Engineering",
      land_size: parseFloat(landSize) || 1.0,
      water_use: parseFloat(waterUse) || 10.0,
      electricity: parseFloat(electricity) || 100.0,
      hazardous: hazardous ? 1 : 0,
      hazard_level: hazardLevel,
      location: location || "Industrial Estate",
      district: district || user?.district || "Pune",
      project_cost: parseFloat(projectCost) || 5.0,
      employment_potential: parseInt(employmentPotential, 10) || 50,
      msme_category: evaluation.msme,
      risk_tier: evaluation.riskTier,
      status: "In Progress",
      clearances_json: JSON.stringify(evaluation.clearances),
      parallel_status_json: JSON.stringify(parallelStatus),
      current_stage: "mpcb",
      stage_statuses: "{}",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    emitEvent({
      event_type: "application_submitted",
      application_id: newApp._id,
      user_id: req.session.user.id,
      from_state: null,
      to_state: "In Progress",
      details: {
        application_no: appNo,
        industryCategory: newApp.industryCategory,
        risk_tier: evaluation.riskTier,
        msme_category: evaluation.msme,
      },
    });

    res.json({
      ok: true,
      id: newApp._id.toString(),
      applicationNo: appNo,
      msmeCategory: evaluation.msme,
      riskTier: evaluation.riskTier,
      hazardLevel,
      clearances: evaluation.clearances,
      schemes: evaluation.schemes,
    });
  } catch (err) {
    console.error("Error creating application:", err);
    res.status(500).json({ error: "Failed to create application: " + err.message });
  }
});

// Update Application
router.put("/api/applications/:id", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId).lean();
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized to update this application" });
    }

    const {
      industryCategory,
      landSize,
      waterUse,
      electricity,
      hazardous,
      hazardLevel: rawHazardLevel,
      location,
      district,
      projectCost,
      employmentPotential,
    } = req.body;

    const hazardLevel =
      rawHazardLevel ||
      (hazardous ? "Chemical Hazard (High Risk)" : "Low Risk / General");

    const evaluation = evaluateRegulatoryChecklist({
      industryCategory: industryCategory || a.industry_category,
      landSize: landSize !== undefined ? landSize : a.land_size,
      waterUse: waterUse !== undefined ? waterUse : a.water_use,
      electricity: electricity !== undefined ? electricity : a.electricity,
      hazardous: hazardous !== undefined ? hazardous : a.hazardous,
      projectCost: projectCost !== undefined ? projectCost : a.project_cost,
    });

    await Application.updateOne(
      { _id: appId },
      {
        $set: {
          industry_category: industryCategory || a.industry_category,
          land_size: landSize !== undefined ? parseFloat(landSize) : a.land_size,
          water_use: waterUse !== undefined ? parseFloat(waterUse) : a.water_use,
          electricity: electricity !== undefined ? parseFloat(electricity) : a.electricity,
          hazardous: hazardous !== undefined ? (hazardous ? 1 : 0) : a.hazardous,
          hazard_level: hazardLevel,
          location: location || a.location,
          district: district || a.district,
          project_cost: projectCost !== undefined ? parseFloat(projectCost) : a.project_cost,
          employment_potential:
            employmentPotential !== undefined
              ? parseInt(employmentPotential, 10)
              : a.employment_potential,
          msme_category: evaluation.msme,
          risk_tier: evaluation.riskTier,
          clearances_json: JSON.stringify(evaluation.clearances),
          updated_at: new Date().toISOString(),
        },
      },
    );

    res.json({
      ok: true,
      id: a._id.toString(),
      applicationNo: a.application_no,
      msmeCategory: evaluation.msme,
      riskTier: evaluation.riskTier,
      hazardLevel,
      clearances: evaluation.clearances,
      schemes: evaluation.schemes,
      message: "Application updated successfully.",
    });
  } catch (err) {
    console.error("Error updating application:", err);
    res.status(500).json({ error: "Failed to update application: " + err.message });
  }
});

// List Applications
router.get("/api/applications", auth, async (req, res) => {
  try {
    if (req.session.user.role === "official") {
      const { status, risk_tier, district, search, company } = req.query;
      const deptCode = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      const andClauses = [];

      if (!isApex && deptCode && deptCode !== "msins") {
        const isParallelDept = ["midc", "dish", "fire"].includes(deptCode);
        const activeStageCondition = isParallelDept
          ? "parallel_scrutiny"
          : "mpcb";

        if (status === "Approved") {
          andClauses.push({
            $or: [
              { stage_statuses: { $regex: `"${deptCode}":{"decision":"Approved"` } },
              { status: "Approved" },
            ],
          });
        } else if (status === "In Progress" || status === "Flagged") {
          andClauses.push({
            $or: [
              { current_stage: activeStageCondition },
              { current_stage: deptCode },
            ],
          });
          andClauses.push({ status });
        } else if (status === "Rejected") {
          andClauses.push({
            $or: [
              { current_stage: activeStageCondition },
              { current_stage: deptCode },
              { stage_statuses: { $regex: `"${deptCode}":{"decision":"Rejected"` } },
            ],
          });
          andClauses.push({ status: "Rejected" });
        } else {
          andClauses.push({
            $or: [
              { current_stage: activeStageCondition },
              { current_stage: deptCode },
              { stage_statuses: { $regex: `"${deptCode}"` } },
            ],
          });
        }
      } else if (!isApex && deptCode === "msins") {
        andClauses.push({
          $or: [
            { current_stage: "msins" },
            { stage_statuses: { $regex: '"msins"' } },
          ],
        });
        if (status && status !== "all") andClauses.push({ status });
      } else {
        if (status && status !== "all") andClauses.push({ status });
      }

      if (risk_tier && risk_tier !== "all") andClauses.push({ risk_tier });
      if (district && district !== "all") andClauses.push({ district });
      const searchKey = search || company;
      if (searchKey) {
        const re = new RegExp(searchKey.trim(), "i");
        andClauses.push({
          $or: [
            { application_no: re },
            { company_name: re },
            { location: re },
            { registration_no: re },
          ],
        });
      }

      const matchStage = andClauses.length > 0 ? { $and: andClauses } : {};

      const rows = await Application.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userArr",
          },
        },
        {
          $addFields: {
            applicant_email: { $ifNull: [{ $arrayElemAt: ["$userArr.email", 0] }, ""] },
            applicant_phone: { $ifNull: [{ $arrayElemAt: ["$userArr.phone", 0] }, ""] },
            contact_person: { $ifNull: [{ $arrayElemAt: ["$userArr.contact_person", 0] }, ""] },
          },
        },
        { $project: { userArr: 0 } },
        { $sort: { created_at: -1 } },
      ]);
      res.json(serialize(rows));
    } else {
      const rows = await Application.find({ user_id: req.session.user.id })
        .sort({ created_at: -1 })
        .lean();
      res.json(serialize(rows));
    }
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ error: "Could not fetch applications" });
  }
});

// Dedicated route for pending applications queue
router.get("/api/applications/pending", auth, async (req, res) => {
  try {
    if (req.session.user.role === "official") {
      const deptCode = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      const andClauses = [{ status: "In Progress" }];
      if (!isApex && deptCode && deptCode !== "msins") {
        const isParallelDept = ["midc", "dish", "fire"].includes(deptCode);
        const activeStage = isParallelDept ? "parallel_scrutiny" : "mpcb";
        andClauses.push({
          $or: [{ current_stage: activeStage }, { current_stage: deptCode }],
        });
      }

      const rows = await Application.aggregate([
        { $match: { $and: andClauses } },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "userArr",
          },
        },
        {
          $addFields: {
            applicant_email: { $ifNull: [{ $arrayElemAt: ["$userArr.email", 0] }, ""] },
            applicant_phone: { $ifNull: [{ $arrayElemAt: ["$userArr.phone", 0] }, ""] },
            contact_person: { $ifNull: [{ $arrayElemAt: ["$userArr.contact_person", 0] }, ""] },
          },
        },
        { $project: { userArr: 0 } },
        { $sort: { created_at: -1 } },
      ]);
      return res.json(serialize(rows));
    } else {
      const rows = await Application.find({
        user_id: req.session.user.id,
        status: "In Progress",
      })
        .sort({ created_at: -1 })
        .lean();
      return res.json(serialize(rows));
    }
  } catch (err) {
    console.error("Error fetching pending applications:", err);
    res.status(500).json({ error: "Could not fetch pending applications" });
  }
});

// Get Application Dossier
router.get("/api/applications/:id", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const rows = await Application.aggregate([
      { $match: { _id: appId } },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "userArr",
        },
      },
      {
        $addFields: {
          applicant_email: { $ifNull: [{ $arrayElemAt: ["$userArr.email", 0] }, ""] },
          applicant_phone: { $ifNull: [{ $arrayElemAt: ["$userArr.phone", 0] }, ""] },
          contact_person: { $ifNull: [{ $arrayElemAt: ["$userArr.contact_person", 0] }, ""] },
          user_dept: { $ifNull: [{ $arrayElemAt: ["$userArr.department", 0] }, ""] },
        },
      },
      { $project: { userArr: 0 } },
    ]);

    const a = rows[0];
    if (!a) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Access denied to this dossier" });
    }

    let clearances = [];
    try {
      clearances = JSON.parse(a.clearances_json || "[]");
    } catch (_) {}

    let parallelStatus = {};
    try {
      parallelStatus = JSON.parse(a.parallel_status_json || "{}");
    } catch (_) {}

    let stageStatuses = {};
    try {
      stageStatuses = JSON.parse(a.stage_statuses || "{}");
    } catch (_) {}

    // Fetch documents
    let documents = await Document.find({ application_id: appId })
      .sort({ created_at: 1 })
      .lean();

    documents = documents.map((d) => ({
      ...d,
      id: d._id.toString(),
      department: d.department || getDocumentDepartment(d),
    }));

    const allPlans = {
      environmental:
        documents.find(
          (d) =>
            d.plan_type === "environmental_plan" ||
            d.department === "mpcb" ||
            (d.document_type || "").toLowerCase().includes("effluent") ||
            (d.document_type || "").toLowerCase().includes("environment") ||
            (d.document_type || "").toLowerCase().includes("water"),
        ) || null,
      civil:
        documents.find(
          (d) =>
            d.plan_type === "civil_plan" ||
            d.department === "midc" ||
            (d.document_type || "").toLowerCase().includes("site") ||
            (d.document_type || "").toLowerCase().includes("civil") ||
            (d.document_type || "").toLowerCase().includes("layout"),
        ) || null,
      factorySafety:
        documents.find(
          (d) =>
            d.plan_type === "factory_safety_plan" ||
            d.department === "dish" ||
            (d.document_type || "").toLowerCase().includes("safety") ||
            (d.document_type || "").toLowerCase().includes("factory") ||
            (d.document_type || "").toLowerCase().includes("machinery"),
        ) || null,
      fireSafety:
        documents.find(
          (d) =>
            d.plan_type === "fire_safety_plan" ||
            d.department === "fire" ||
            (d.document_type || "").toLowerCase().includes("fire") ||
            (d.document_type || "").toLowerCase().includes("hydrant") ||
            (d.document_type || "").toLowerCase().includes("evacuation"),
        ) || null,
    };

    let plans = { ...allPlans };

    if (req.session.user.role === "official") {
      const isApex =
        req.session.user.isApex ||
        req.session.user.deptCode === "msins" ||
        req.session.user.email === "officer@udyog.gov.in";
      if (!isApex) {
        const officerDept = req.session.user.deptCode;
        documents = documents.filter((d) => {
          const dept = d.department || getDocumentDepartment(d);
          return dept === officerDept;
        });
        plans = {
          environmental: officerDept === "mpcb" ? allPlans.environmental : null,
          civil: officerDept === "midc" ? allPlans.civil : null,
          factorySafety: officerDept === "dish" ? allPlans.factorySafety : null,
          fireSafety: officerDept === "fire" ? allPlans.fireSafety : null,
        };
      }
    }

    // Fetch queries with officer details
    const queries = await Query.aggregate([
      { $match: { application_id: appId } },
      {
        $lookup: {
          from: "users",
          localField: "officer_id",
          foreignField: "_id",
          as: "officerArr",
        },
      },
      {
        $addFields: {
          officer_dept: { $ifNull: [{ $arrayElemAt: ["$officerArr.company_name", 0] }, ""] },
          officer_name: { $ifNull: [{ $arrayElemAt: ["$officerArr.contact_person", 0] }, ""] },
        },
      },
      { $project: { officerArr: 0 } },
      { $sort: { created_at: -1 } },
    ]);

    // Fetch inspections
    const inspections = await Inspection.find({ application_id: appId })
      .sort({ scheduled_date: 1 })
      .lean();

    const schemesInfo = evaluateRegulatoryChecklist({
      landSize: a.land_size,
      waterUse: a.water_use,
      electricity: a.electricity,
      hazardous: a.hazardous,
      projectCost: a.project_cost,
      industryCategory: a.industry_category,
    });

    const departmentRemarks = {
      mpcb: stageStatuses.mpcb?.remarks || parallelStatus.mpcb?.remarks || "",
      midc: stageStatuses.midc?.remarks || parallelStatus.midc?.remarks || "",
      dish: stageStatuses.dish?.remarks || parallelStatus.dish?.remarks || "",
      fire: stageStatuses.fire?.remarks || parallelStatus.fire?.remarks || "",
      msins: stageStatuses.msins?.remarks || "",
    };

    for (const key of Object.keys(plans)) {
      if (plans[key]) {
        plans[key].file_name = plans[key].original_name;
      }
    }

    res.json({
      ...serialize(a),
      hazardLevel:
        a.hazard_level ||
        (a.hazardous ? "Chemical Hazard (High Risk)" : "Low Risk / General"),
      clearances,
      parallelStatus,
      stageStatuses,
      departmentRemarks,
      currentStage: a.current_stage || "mpcb",
      documents: documents.map((d) => ({ ...serialize(d), file_name: d.original_name })),
      plans,
      queries: serialize(queries),
      inspections: serialize(inspections),
      eligibleSchemes: schemesInfo.schemes,
    });
  } catch (err) {
    console.error("Error fetching dossier:", err);
    res.status(500).json({ error: "Failed to fetch application dossier" });
  }
});

// Stage Decision Engine
router.post("/api/applications/:id/stage-decision", auth, official, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found." });

    const { decision, remarks, targetDept } = req.body;

    if (!decision || !["Approved", "Rejected", "Query"].includes(decision)) {
      return res.status(400).json({
        error: "Decision must be 'Approved', 'Rejected', or 'Query'.",
      });
    }

    const appRow = await Application.findById(appId).lean();
    if (!appRow) {
      return res.status(404).json({ error: "Application not found." });
    }

    if (appRow.status === "Approved" || appRow.status === "Rejected") {
      return res.status(400).json({
        error: `Application is already ${appRow.status}. No further decisions can be made.`,
      });
    }

    const currentStage = appRow.current_stage || "mpcb";
    const officerDept = req.session.user.deptCode;
    const isApex = req.session.user.isApex;

    let activeDept = officerDept;
    if (isApex && targetDept) {
      activeDept = targetDept;
    }

    if (currentStage === "mpcb") {
      if (officerDept !== "mpcb" && (!isApex || targetDept !== "mpcb")) {
        return res.status(403).json({
          error:
            "This application is in Phase 1 (Environmental Review). It must be approved by the Environment Officer (Pollution Control Board) before other departments can review.",
        });
      }
      activeDept = "mpcb";
    } else if (
      currentStage === "parallel_scrutiny" ||
      ["midc", "dish", "fire"].includes(currentStage)
    ) {
      if (
        !["midc", "dish", "fire"].includes(officerDept) &&
        (!isApex || !["midc", "dish", "fire"].includes(targetDept))
      ) {
        const deptNames = {
          mpcb: "Maharashtra Pollution Control Board",
          midc: "Maharashtra Industrial Development Corporation",
          dish: "Directorate of Industrial Safety & Health",
          fire: "Directorate of Fire Services",
          msins: "Maharashtra State Innovation Society",
        };
        return res.status(403).json({
          error: `Access Denied: You belong to ${deptNames[officerDept] || officerDept} and are not authorized for Phase 2 simultaneous scrutiny.`,
        });
      }
      if (!activeDept || !["midc", "dish", "fire"].includes(activeDept)) {
        activeDept = targetDept || officerDept || "midc";
      }
    } else if (currentStage === "msins") {
      if (!isApex && officerDept !== "msins") {
        return res.status(403).json({
          error:
            "Access Denied: Final Single-Window Clearance is strictly reserved for the Department Officer (State Innovation Society / Industries Apex Authority).",
        });
      }
      activeDept = "msins";
    } else {
      return res.status(400).json({
        error: `Application is not in an active scrutiny phase (current stage: "${currentStage}").`,
      });
    }

    let stageStatuses = {};
    try {
      stageStatuses = JSON.parse(appRow.stage_statuses || "{}");
    } catch (_) {}

    stageStatuses[activeDept] = {
      decision,
      remarks:
        (remarks || "").trim() ||
        `${decision} by ${STAGE_LABELS[activeDept] || activeDept.toUpperCase()}.`,
      officer: req.session.user.contactPerson || req.session.user.email,
      officer_dept: STAGE_LABELS[activeDept] || activeDept.toUpperCase(),
      decided_at: new Date().toISOString(),
    };

    let parallelStatus = {};
    try {
      parallelStatus = JSON.parse(appRow.parallel_status_json || "{}");
    } catch (_) {}

    if (!parallelStatus[activeDept]) {
      parallelStatus[activeDept] = {};
    }
    parallelStatus[activeDept].status =
      decision === "Approved"
        ? "Approved"
        : decision === "Rejected"
          ? "Deficient"
          : "Query Raised";
    if (remarks) parallelStatus[activeDept].remarks = remarks.trim();
    parallelStatus[activeDept].officer =
      req.session.user.contactPerson || req.session.user.email;
    parallelStatus[activeDept].updated = new Date().toISOString();

    let clearances = [];
    try {
      clearances = JSON.parse(appRow.clearances_json || "[]");
    } catch (_) {}

    clearances = clearances.map((c) => {
      if (
        c.taskDept === activeDept ||
        (!c.taskDept && (c.dept || "").toLowerCase().includes(activeDept))
      ) {
        return {
          ...c,
          status:
            decision === "Approved"
              ? "Approved"
              : decision === "Rejected"
                ? "Deficient"
                : "Under Review",
        };
      }
      return c;
    });

    if (decision === "Rejected") {
      await Application.updateOne(
        { _id: appId },
        {
          $set: {
            status: "Rejected",
            stage_statuses: JSON.stringify(stageStatuses),
            parallel_status_json: JSON.stringify(parallelStatus),
            clearances_json: JSON.stringify(clearances),
            updated_at: new Date().toISOString(),
          },
        },
      );

      emitEvent({
        event_type: "stage_decision",
        application_id: appId,
        user_id: appRow.user_id,
        officer_id: req.session.user.id,
        department: activeDept,
        from_state: currentStage,
        to_state: "Rejected",
        details: { decision: "Rejected", remarks, activeDept },
      });

      return res.json({
        ok: true,
        message: `Application rejected by ${STAGE_LABELS[activeDept] || activeDept}. Pipeline halted.`,
        currentStage,
        nextStage: null,
        status: "Rejected",
      });
    }

    if (decision === "Query") {
      if (!remarks || !remarks.trim()) {
        return res.status(400).json({
          error: "A query message is required when raising a query.",
        });
      }

      await Query.create({
        application_id: appId,
        officer_id: req.session.user.id,
        message: remarks.trim(),
        status: "Open",
      });

      await Application.updateOne(
        { _id: appId },
        {
          $set: {
            status: "Flagged",
            parallel_status_json: JSON.stringify(parallelStatus),
            clearances_json: JSON.stringify(clearances),
            updated_at: new Date().toISOString(),
          },
        },
      );

      emitEvent({
        event_type: "query_raised",
        application_id: appId,
        user_id: appRow.user_id,
        officer_id: req.session.user.id,
        department: activeDept,
        from_state: currentStage,
        to_state: "Flagged",
        details: { message: remarks.trim(), activeDept },
      });

      return res.json({
        ok: true,
        message: `Query raised by ${STAGE_LABELS[activeDept] || activeDept}. Applicant has been notified to respond.`,
        currentStage,
        status: "Flagged",
      });
    }

    // Decision === "Approved"
    let nextStage = currentStage;
    let newOverallStatus = "In Progress";
    let stageMsg = `Clearance approved by ${STAGE_LABELS[activeDept] || activeDept}.`;

    if (currentStage === "mpcb") {
      nextStage = "parallel_scrutiny";
      if (parallelStatus.midc) parallelStatus.midc.status = "Under Scrutiny";
      if (parallelStatus.dish) parallelStatus.dish.status = "Under Scrutiny";
      if (parallelStatus.fire) parallelStatus.fire.status = "Under Scrutiny";
      stageMsg =
        "Phase 1 Environmental clearance granted by Maharashtra Pollution Control Board. Application forwarded simultaneously to Industrial Development Corporation Civil, Directorate of Industrial Safety & Health, and Directorate of Fire Services.";
    } else if (
      currentStage === "parallel_scrutiny" ||
      ["midc", "dish", "fire"].includes(currentStage)
    ) {
      const midcApproved = stageStatuses.midc?.decision === "Approved";
      const dishApproved = stageStatuses.dish?.decision === "Approved";
      const fireApproved = stageStatuses.fire?.decision === "Approved";

      if (midcApproved && dishApproved && fireApproved) {
        nextStage = "msins";
        if (parallelStatus.msins) {
          parallelStatus.msins.status = "Pending Final Apex Clearance";
        }
        stageMsg =
          "All confirming departmental clearances (Industrial Development Corporation Civil, Directorate of Industrial Safety & Health, Directorate of Fire Services) secured! Dossier forwarded to Department Officer (State Innovation Society Apex Authority) for final clearance.";
      } else {
        nextStage = "parallel_scrutiny";
        const pending = [];
        if (!midcApproved) pending.push("Industrial Development Corporation Civil");
        if (!dishApproved) pending.push("Directorate of Industrial Safety & Health");
        if (!fireApproved) pending.push("Directorate of Fire Services");
        stageMsg = `Approved by ${STAGE_LABELS[activeDept] || activeDept}. Awaiting simultaneous clearance from: ${pending.join(", ")}.`;
      }
    } else if (currentStage === "msins") {
      const suppCount = await Document.countDocuments({
        application_id: appId,
        $or: [
          { plan_type: "supporting_doc" },
          {
            plan_type: {
              $nin: [
                "environmental_plan",
                "civil_plan",
                "factory_safety_plan",
                "fire_safety_plan",
              ],
            },
          },
        ],
      });

      if (suppCount === 0) {
        return res.status(400).json({
          error:
            "Final Single-Window Approval requires at least 1 verified supporting document (e.g. Incentive Eligibility Certificate or Site Inspection Report) in the dossier before sanctioning.",
        });
      }

      newOverallStatus = "Approved";
      nextStage = "completed";
      if (parallelStatus.msins) {
        parallelStatus.msins.status = "Approved & Permitted";
        parallelStatus.msins.remarks =
          "Single-Window Consolidated Approval Granted. License certificate issued.";
        parallelStatus.msins.updated = new Date().toISOString();
      }
      stageMsg =
        "Consolidated Single-Window Industrial Establishment Permit granted by Department Officer (State Innovation Society Apex Authority). Digital license certificate issued.";
    }

    await Application.updateOne(
      { _id: appId },
      {
        $set: {
          current_stage: nextStage,
          stage_statuses: JSON.stringify(stageStatuses),
          parallel_status_json: JSON.stringify(parallelStatus),
          clearances_json: JSON.stringify(clearances),
          status: newOverallStatus,
          updated_at: new Date().toISOString(),
        },
      },
    );

    emitEvent({
      event_type: "stage_decision",
      application_id: appId,
      user_id: appRow.user_id,
      officer_id: req.session.user.id,
      department: activeDept,
      from_state: currentStage,
      to_state: nextStage,
      details: { decision: "Approved", remarks, newOverallStatus, nextStage, activeDept },
    });

    console.log(
      `[Pipeline 3-Phase] App ${appRow.application_no}: ${currentStage} → ${nextStage} (${newOverallStatus}) by ${activeDept}`,
    );

    res.json({
      ok: true,
      message: stageMsg,
      currentStage,
      nextStage,
      activeDept,
      status: newOverallStatus,
    });
  } catch (err) {
    console.error("Stage decision error:", err);
    res.status(500).json({ error: "Failed to record stage decision: " + err.message });
  }
});

// Pipeline Status Endpoint
router.get("/api/applications/:id/pipeline", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(
      appId,
      "user_id application_no company_name status current_stage stage_statuses parallel_status_json",
    ).lean();

    if (!a) return res.status(404).json({ error: "Application not found" });

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Access Denied: You do not own this application." });
    }

    let stageStatuses = {};
    try {
      stageStatuses = JSON.parse(a.stage_statuses || "{}");
    } catch (_) {}

    const curr = a.current_stage || "mpcb";

    const stages = [
      {
        code: "mpcb",
        phase: 1,
        label: "Pollution Control Board (Environmental Clearance)",
        status: stageStatuses.mpcb
          ? stageStatuses.mpcb.decision
          : curr === "mpcb"
            ? "Pending"
            : "Approved",
        remarks: stageStatuses.mpcb?.remarks || null,
        officer: stageStatuses.mpcb?.officer || null,
        decided_at: stageStatuses.mpcb?.decided_at || null,
      },
      {
        code: "midc",
        phase: 2,
        label: "Industrial Development Corporation (Civil & Infrastructure)",
        status: stageStatuses.midc
          ? stageStatuses.midc.decision
          : curr === "mpcb"
            ? "Waiting"
            : curr === "parallel_scrutiny"
              ? "Under Review"
              : "Approved",
        remarks: stageStatuses.midc?.remarks || null,
        officer: stageStatuses.midc?.officer || null,
        decided_at: stageStatuses.midc?.decided_at || null,
      },
      {
        code: "dish",
        phase: 2,
        label: "Directorate of Industrial Safety & Health (Factory Safety)",
        status: stageStatuses.dish
          ? stageStatuses.dish.decision
          : curr === "mpcb"
            ? "Waiting"
            : curr === "parallel_scrutiny"
              ? "Under Review"
              : "Approved",
        remarks: stageStatuses.dish?.remarks || null,
        officer: stageStatuses.dish?.officer || null,
        decided_at: stageStatuses.dish?.decided_at || null,
      },
      {
        code: "fire",
        phase: 2,
        label: "Directorate of Fire Services",
        status: stageStatuses.fire
          ? stageStatuses.fire.decision
          : curr === "mpcb"
            ? "Waiting"
            : curr === "parallel_scrutiny"
              ? "Under Review"
              : "Approved",
        remarks: stageStatuses.fire?.remarks || null,
        officer: stageStatuses.fire?.officer || null,
        decided_at: stageStatuses.fire?.decided_at || null,
      },
      {
        code: "msins",
        phase: 3,
        label: "State Innovation Society Apex Officer (Final Approval)",
        status: stageStatuses.msins
          ? stageStatuses.msins.decision
          : curr === "msins"
            ? "Pending"
            : a.status === "Approved"
              ? "Approved"
              : "Waiting",
        remarks: stageStatuses.msins?.remarks || null,
        officer: stageStatuses.msins?.officer || null,
        decided_at: stageStatuses.msins?.decided_at || null,
      },
    ];

    res.json({
      applicationNo: a.application_no,
      companyName: a.company_name,
      overallStatus: a.status,
      currentStage: a.current_stage,
      stages,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pipeline status" });
  }
});

// Department Clearance Update
router.patch(
  "/api/applications/:id/department-clearance",
  auth,
  official,
  async (req, res) => {
    try {
      const appId = toObjectId(req.params.id);
      if (!appId) return res.status(404).json({ error: "Application dossier not found." });

      const { deptCode, status, remarks } = req.body;

      if (!deptCode || !status) {
        return res.status(400).json({
          error: "Department code and clearance status are required.",
        });
      }

      const officerDept = req.session.user.deptCode;
      const isApex = req.session.user.isApex;

      if (!isApex && officerDept && officerDept !== deptCode) {
        return res.status(403).json({
          error: `Access Denied: You belong to ${officerDept.toUpperCase()} and are not authorized to update ${deptCode.toUpperCase()} clearances.`,
        });
      }

      const appRow = await Application.findById(appId).lean();
      if (!appRow) {
        return res.status(404).json({ error: "Application dossier not found." });
      }

      if (appRow.status === "Approved" || appRow.status === "Rejected") {
        return res.status(400).json({
          error: `Application is already ${appRow.status}. No further clearance updates can be made.`,
        });
      }

      const activePhaseStage = appRow.current_stage || "mpcb";
      if (["midc", "dish", "fire"].includes(deptCode) && activePhaseStage === "mpcb") {
        return res.status(403).json({
          error:
            "This application is in Phase 1 (Environmental Review). It must be approved by Maharashtra Pollution Control Board before Phase 2 departments can issue clearances.",
        });
      }
      if (deptCode === "mpcb" && activePhaseStage !== "mpcb") {
        return res.status(400).json({
          error: "Phase 1 Environmental Review has already concluded for this application.",
        });
      }
      if (deptCode === "msins" && activePhaseStage !== "msins") {
        return res.status(403).json({
          error:
            "State Innovation Society Final Clearance can only be issued after Phase 1 and Phase 2 departmental reviews are complete.",
        });
      }

      let parallelStatus = {};
      try {
        parallelStatus = JSON.parse(appRow.parallel_status_json || "{}");
      } catch (_) {}

      if (!parallelStatus[deptCode]) {
        parallelStatus[deptCode] = {};
      }

      parallelStatus[deptCode].status = status;
      if (remarks) parallelStatus[deptCode].remarks = remarks;
      parallelStatus[deptCode].officer = req.session.user.contactPerson;
      parallelStatus[deptCode].updated = new Date().toISOString();

      let clearances = [];
      try {
        clearances = JSON.parse(appRow.clearances_json || "[]");
      } catch (_) {}

      let stageStatuses = {};
      try {
        stageStatuses = JSON.parse(appRow.stage_statuses || "{}");
      } catch (_) {}

      let currentStage = appRow.current_stage || "mpcb";
      let overallStatus = appRow.status;

      if (status === "Approved") {
        stageStatuses[deptCode] = {
          decision: "Approved",
          remarks: remarks || `Approved by ${STAGE_LABELS[deptCode] || deptCode.toUpperCase()}`,
          officer: req.session.user.contactPerson || req.session.user.email,
          officer_dept: STAGE_LABELS[deptCode] || deptCode.toUpperCase(),
          decided_at: new Date().toISOString(),
        };

        if (currentStage === "mpcb" && deptCode === "mpcb") {
          currentStage = "parallel_scrutiny";
          if (parallelStatus.midc) parallelStatus.midc.status = "Under Scrutiny";
          if (parallelStatus.dish) parallelStatus.dish.status = "Under Scrutiny";
          if (parallelStatus.fire) parallelStatus.fire.status = "Under Scrutiny";
        } else if (
          (currentStage === "parallel_scrutiny" || ["midc", "dish", "fire"].includes(currentStage)) &&
          ["midc", "dish", "fire"].includes(deptCode)
        ) {
          const midcOk = stageStatuses.midc?.decision === "Approved";
          const dishOk = stageStatuses.dish?.decision === "Approved";
          const fireOk = stageStatuses.fire?.decision === "Approved";
          if (midcOk && dishOk && fireOk) {
            currentStage = "msins";
            if (parallelStatus.msins) parallelStatus.msins.status = "Pending Final Apex Clearance";
          } else {
            currentStage = "parallel_scrutiny";
          }
        } else if (currentStage === "msins" && (deptCode === "msins" || isApex)) {
          currentStage = "completed";
          overallStatus = "Approved";
          if (parallelStatus.msins) parallelStatus.msins.status = "Approved";
        }
      } else if (status === "Rejected") {
        stageStatuses[deptCode] = {
          decision: "Rejected",
          remarks: remarks || `Rejected by ${STAGE_LABELS[deptCode] || deptCode.toUpperCase()}`,
          officer: req.session.user.contactPerson || req.session.user.email,
          officer_dept: STAGE_LABELS[deptCode] || deptCode.toUpperCase(),
          decided_at: new Date().toISOString(),
        };
        overallStatus = "Rejected";
      }

      const deptMatches = {
        midc: ["midc", "land", "building"],
        mpcb: ["mpcb", "consent to establish", "cte"],
        fire: ["fire"],
        dish: ["dish", "factory"],
        msedcl: ["msedcl", "power", "ht", "lt"],
      };

      clearances = clearances.map((c) => {
        if (c.taskDept) {
          if (c.taskDept === deptCode) {
            return { ...c, status };
          }
        } else {
          const keywords = deptMatches[deptCode] || [deptCode];
          const matches = keywords.some((k) => (c.dept || "").toLowerCase().includes(k));
          if (matches) {
            return { ...c, status };
          }
        }
        return c;
      });

      await Application.updateOne(
        { _id: appId },
        {
          $set: {
            current_stage: currentStage,
            stage_statuses: JSON.stringify(stageStatuses),
            parallel_status_json: JSON.stringify(parallelStatus),
            clearances_json: JSON.stringify(clearances),
            status: overallStatus,
            updated_at: new Date().toISOString(),
          },
        },
      );

      res.json({
        ok: true,
        message: `${deptCode.toUpperCase()} milestone status updated to '${status}'.`,
        parallelStatus,
        clearances,
        currentStage,
        overallStatus,
      });
    } catch (err) {
      console.error("Department clearance error:", err);
      res.status(500).json({
        error: "Failed to update departmental clearance: " + err.message,
      });
    }
  },
);

// Overall Application Status (APEX Restricted for Approval / Rejection)
router.patch("/api/applications/:id/status", auth, official, async (req, res) => {
  try {
    const { status, remarks, parallelStatus } = req.body;
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found." });

    if (!status || !["In Progress", "Approved", "Rejected", "Flagged"].includes(status)) {
      return res.status(400).json({ error: "Invalid application status specified." });
    }

    const existing = await Application.findById(appId).lean();
    if (!existing) {
      return res.status(404).json({ error: "Application not found." });
    }
    if (existing.status === "Approved" || existing.status === "Rejected") {
      return res.status(400).json({
        error: `Application is already ${existing.status}. No further status modifications permitted.`,
      });
    }

    if ((status === "Approved" || status === "Rejected") && !req.session.user.isApex) {
      return res.status(403).json({
        error:
          "Consolidated Single-Window Final Approval and Clearance Certificate issuance is strictly reserved for the Department Officer (State Innovation Society / Industries) - Apex Authority.",
      });
    }

    const updateFields = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (parallelStatus) {
      updateFields.parallel_status_json = JSON.stringify(parallelStatus);
    }

    if (status === "Approved") {
      let stageStatuses = {};
      try {
        stageStatuses = JSON.parse(existing.stage_statuses || "{}");
      } catch (_) {}

      if (!stageStatuses.msins) {
        stageStatuses.msins = {
          decision: "Approved",
          remarks:
            remarks ||
            "Consolidated Single-Window Statutory Clearance & Certificate issued by Directorate of Industries & State Innovation Society (Apex Authority).",
          officer: req.session.user.contactPerson || req.session.user.email,
          officer_dept: "Directorate of Industries & State Innovation Society",
          decided_at: new Date().toISOString(),
        };
      }
      updateFields.stage_statuses = JSON.stringify(stageStatuses);
      updateFields.current_stage = "completed";
    }

    await Application.updateOne({ _id: appId }, { $set: updateFields });

    res.json({ ok: true, message: `Application status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// Digital Clearance Certificate
router.get("/api/applications/:id/certificate", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId).lean();
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (
      req.session.user.role !== "official" &&
      a.user_id.toString() !== req.session.user.id
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (a.status !== "Approved") {
      return res.status(400).json({
        error: "Clearance Certificate can only be issued for approved applications.",
      });
    }

    const certNo = `CERT/MH/IND/${a._id.toString()}/${new Date(a.created_at).getFullYear()}`;
    const certHash = crypto
      .createHash("sha256")
      .update(`${a.application_no}-${a.company_name}-APPROVED-MAHARASHTRA`)
      .digest("hex")
      .toUpperCase()
      .slice(0, 24);

    res.json({
      certificateNo: certNo,
      applicationNo: a.application_no,
      companyName: a.company_name,
      registrationNo: a.registration_no,
      location: a.location,
      district: a.district,
      industryCategory: a.industry_category,
      riskTier: a.risk_tier,
      projectCost: a.project_cost,
      status: a.status,
      issuedBy:
        "Government of Maharashtra - Directorate of Industries & State Innovation Society",
      issuedDate: new Date().toISOString().split("T")[0],
      validUntil: `${new Date().getFullYear() + 5}-03-31`,
      verificationHash: certHash,
      statutoryAct:
        "Maharashtra Industrial Development Act, 1961 & Single Window Act",
    });
  } catch (err) {
    res.status(500).json({ error: "Could not generate certificate data" });
  }
});

// ── Statutory Fee Challan Engine ──────────────────────────────────────
router.get("/api/applications/:id/challan", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId);
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (req.session.user.role !== "official" && a.user_id.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!a.fee_breakdown) {
      a.fee_breakdown = calculateStatutoryFees(a);
      await a.save();
    }

    res.json({
      ok: true,
      application_no: a.application_no,
      company_name: a.company_name,
      challan: a.fee_breakdown,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve statutory fee challan: " + err.message });
  }
});

router.post("/api/applications/:id/pay-fees", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId);
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (a.user_id.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!a.fee_breakdown) {
      a.fee_breakdown = calculateStatutoryFees(a);
    }

    a.fee_breakdown.payment_status = "Paid";
    a.fee_breakdown.paid_at = new Date().toISOString();
    a.fee_breakdown.transaction_id = `TXN-MH-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    a.fee_breakdown.payment_method = req.body.payment_method || "Bharatkosh NetBanking";
    a.markModified("fee_breakdown");
    await a.save();

    emitEvent({
      event_type: "fee_paid",
      application_id: a._id,
      user_id: a.user_id,
      from_state: "Pending Payment",
      to_state: "Paid",
      details: {
        grn: a.fee_breakdown.grn,
        amount: a.fee_breakdown.total_amount,
        transaction_id: a.fee_breakdown.transaction_id,
      },
    });

    res.json({
      ok: true,
      message: "Statutory clearance fees recorded successfully.",
      fee_breakdown: a.fee_breakdown,
    });
  } catch (err) {
    res.status(500).json({ error: "Payment recording failed: " + err.message });
  }
});

// ── Inter-Departmental Joint Notes ────────────────────────────────────
router.post("/api/applications/:id/internal-notes", auth, official, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const noteText = req.body.note || req.body.note_text;
    if (!noteText || !noteText.trim()) {
      return res.status(400).json({ error: "Internal note cannot be empty." });
    }

    const a = await Application.findById(appId);
    if (!a) return res.status(404).json({ error: "Application not found" });

    const newNote = {
      id: crypto.randomBytes(6).toString("hex"),
      author_id: req.session.user.id,
      author_name: req.session.user.name || "Regulatory Officer",
      department: req.session.user.deptCode || "apex",
      note: noteText.trim(),
      created_at: new Date().toISOString(),
    };

    a.internal_notes = a.internal_notes || [];
    a.internal_notes.push(newNote);
    a.markModified("internal_notes");
    await a.save();

    res.json({ ok: true, note: newNote, internal_notes: a.internal_notes });
  } catch (err) {
    res.status(500).json({ error: "Failed to record internal note: " + err.message });
  }
});

router.get("/api/applications/:id/internal-notes", auth, official, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId).lean();
    if (!a) return res.status(404).json({ error: "Application not found" });

    res.json({ ok: true, internal_notes: a.internal_notes || [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch internal notes: " + err.message });
  }
});

// ── Statutory Deemed Approval Engine ──────────────────────────────────
router.post("/api/applications/:id/deemed-approve", auth, official, async (req, res) => {
  try {
    if (!req.session.user.isApex && req.session.user.deptCode !== "msins") {
      return res.status(403).json({
        error: "Statutory Deemed Approval authority is exclusively vested in the Lead Approving Officer (Maharashtra State Innovation Society / Industries Apex Authority).",
      });
    }

    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId);
    if (!a) return res.status(404).json({ error: "Application not found" });

    const sla = evaluateApplicationSla(a);
    const reason = req.body.reason || "Exceeded statutory departmental review window under Maharashtra Right to Public Services Act 2015.";

    a.sla_escalation = {
      ...sla,
      deemed_approved: true,
      deemed_reason: reason,
      deemed_by: req.session.user.email,
      deemed_at: new Date().toISOString(),
    };

    // If in Phase 1 or 2, advance directly
    if (a.current_stage === "mpcb") {
      a.current_stage = "parallel_scrutiny";
      a.parallel_status_json = JSON.stringify({ midc: "In Progress", dish: "In Progress", fire: "In Progress" });
    } else if (a.current_stage === "parallel_scrutiny" || ["midc", "dish", "fire"].includes(a.current_stage)) {
      a.current_stage = "msins";
      a.parallel_status_json = JSON.stringify({ midc: "Approved", dish: "Approved", fire: "Approved" });
    } else {
      a.status = "Approved";
    }

    a.updated_at = new Date().toISOString();
    a.markModified("sla_escalation");
    await a.save();

    emitEvent({
      event_type: "deemed_approval_invoked",
      application_id: a._id,
      officer_id: req.session.user.id,
      department: "msins",
      from_state: "SLA Exceeded",
      to_state: a.current_stage,
      details: { reason, days_elapsed: sla.days_elapsed },
    });

    res.json({
      ok: true,
      message: "Statutory Deemed Approval successfully invoked by Apex Authority.",
      application: a,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to execute deemed approval: " + err.message });
  }
});

// ── Spatial GIS Industrial Plot Selector ──────────────────────────────
router.post("/api/applications/:id/gis-plot", auth, async (req, res) => {
  try {
    const appId = toObjectId(req.params.id);
    if (!appId) return res.status(404).json({ error: "Application not found" });

    const a = await Application.findById(appId);
    if (!a) return res.status(404).json({ error: "Application not found" });

    if (req.session.user.role !== "official" && a.user_id.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { park_name, plot_no, coordinates, polygon_area_sqm, setback_front, setback_side, eco_distance_km } = req.body;
    a.gis_plot = {
      park_name: park_name || "MIDC Industrial Estate",
      plot_no: plot_no || "Plot-A",
      coordinates: coordinates || [18.5204, 73.8567],
      polygon_area_sqm: polygon_area_sqm || 4046.86,
      setback_front: setback_front || 6.0,
      setback_side: setback_side || 4.5,
      eco_distance_km: eco_distance_km || 12.5,
      selected_at: new Date().toISOString(),
    };

    a.markModified("gis_plot");
    await a.save();

    res.json({ ok: true, gis_plot: a.gis_plot });
  } catch (err) {
    res.status(500).json({ error: "Failed to save GIS plot selection: " + err.message });
  }
});

module.exports = router;

