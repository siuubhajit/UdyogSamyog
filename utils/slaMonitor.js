"use strict";
/**
 * Udyog Samyog — Statutory Service Level Agreement (SLA) & Deemed Approval Engine
 * 
 * Enforces the Maharashtra Right to Public Services Act, 2015:
 * - Total statutory Single-Window ceiling: 45 working days.
 * - Departmental scrutiny window: 15 working days per phase.
 * - Triggers escalation warnings at Day 10, Day 14, and deemed approval eligibility at Day 15+.
 */

const { Application, Event } = require("../db/models");

function evaluateApplicationSla(app) {
  const createdDate = app.created_at ? new Date(app.created_at) : new Date();
  const now = new Date();
  const diffMs = now - createdDate;
  const daysElapsed = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const slaCeilingDays = 45;
  const daysRemaining = Math.max(0, slaCeilingDays - daysElapsed);

  let level = "normal"; // normal | warning | escalated | deemed_eligible
  const stage = (app.current_stage || "mpcb").toLowerCase();

  if (daysElapsed > slaCeilingDays) {
    level = "escalated";
  } else if (daysElapsed >= 15 && (stage.includes("mpcb") || stage.includes("midc") || stage.includes("dish") || stage.includes("fire"))) {
    level = "deemed_eligible";
  } else if (daysElapsed >= 10) {
    level = "warning";
  }

  return {
    days_elapsed: daysElapsed,
    sla_ceiling_days: slaCeilingDays,
    days_remaining: daysRemaining,
    level,
    is_breached: daysElapsed > slaCeilingDays,
    deemed_approval_eligible: level === "deemed_eligible" || daysElapsed > 15,
    statutory_act: "Maharashtra Right to Public Services Act, 2015 (Section 4)",
  };
}

async function checkAllApplicationsSla() {
  try {
    const activeApps = await Application.find({
      status: { $in: ["In Progress", "Under Review", "Flagged"] },
    }).lean();

    const updates = [];
    for (const app of activeApps) {
      const sla = evaluateApplicationSla(app);
      if (!app.sla_escalation || app.sla_escalation.days_elapsed !== sla.days_elapsed || app.sla_escalation.level !== sla.level) {
        updates.push(
          Application.findByIdAndUpdate(app._id, {
            sla_escalation: {
              ...sla,
              last_checked_at: new Date().toISOString(),
            },
          })
        );
      }
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }
    return { evaluated_count: activeApps.length, updated_count: updates.length };
  } catch (err) {
    console.warn("[slaMonitor error]:", err.message);
    return { error: err.message };
  }
}

module.exports = {
  evaluateApplicationSla,
  checkAllApplicationsSla,
};

