"use strict";
/**
 * Udyog Samyog — Statutory Government Fee & Challan Engine
 * 
 * Computes official regulatory scrutiny fees across:
 * 1. Maharashtra Pollution Control Board (Water & Air Act fee schedules)
 * 2. Maharashtra Industrial Development Corporation (Development Control Regulations)
 * 3. Directorate of Maharashtra Fire Services (Fire Prevention Act)
 * 4. Directorate of Industrial Safety & Health (Maharashtra Factories Rules)
 */

function calculateStatutoryFees(app = {}) {
  const cost = parseFloat(app.project_cost || app.projectCost || 0); // in Crores
  const land = parseFloat(app.land_size || app.landSize || 1.0); // in Acres
  const emp = parseInt(app.employment_potential || app.employmentPotential || 20, 10);
  const isHazardous = !!(app.hazardous);
  const riskTier = app.risk_tier || app.riskTier || (isHazardous ? "Red" : "Orange");

  // 1. MPCB Consent to Establish Fee (G.R. No. ENV-2020/CR-45/TC-3)
  let mpcbFee = 15000;
  if (cost > 100) {
    mpcbFee = 250000;
  } else if (cost > 25) {
    mpcbFee = 100000;
  } else if (cost > 5) {
    mpcbFee = 50000;
  } else if (cost > 1) {
    mpcbFee = 25000;
  }

  // 2. MIDC Infrastructure & Development Plan Scrutiny Fee
  const midcFee = Math.round(5000 + (land * 2500));

  // 3. Directorate of Fire Services Life Safety Verification Fee
  let fireFee = 7500;
  if (riskTier === "Red" || isHazardous) {
    fireFee = 25000;
  } else if (riskTier === "Orange") {
    fireFee = 15000;
  }

  // 4. DISH Factory Layout Vetting Fee (Factories Rules, 1963 Schedule A)
  let dishFee = 4000;
  if (emp > 250) {
    dishFee = 20000;
  } else if (emp > 50) {
    dishFee = 10000;
  }

  const total = mpcbFee + midcFee + fireFee + dishFee;
  const grn = `MH-GRN-2026-${Math.random().toString(16).substring(2, 10).toUpperCase()}`;

  return {
    grn,
    currency: "INR",
    line_items: [
      {
        department: "mpcb",
        name: "MPCB Consent to Establish Scrutiny Fee",
        act: "Water (P&CP) Act 1974 & Air (P&CP) Act 1981",
        amount: mpcbFee,
      },
      {
        department: "midc",
        name: "MIDC Building Plan & Infrastructure Scrutiny",
        act: "Maharashtra Regional & Town Planning Act 1966",
        amount: midcFee,
      },
      {
        department: "fire",
        name: "Directorate of Fire Services Scrutiny Fee",
        act: "Maharashtra Fire Prevention & Life Safety Measures Act 2006",
        amount: fireFee,
      },
      {
        department: "dish",
        name: "DISH Factory Blueprint & Safety Approval Fee",
        act: "Factories Act 1948 (Maharashtra Rules)",
        amount: dishFee,
      },
    ],
    breakdown: {
      mpcb: mpcbFee,
      midc: midcFee,
      fire: fireFee,
      dish: dishFee,
    },
    total_amount: total,
    treasury_head: "0070-Other Administrative Services-60-800",
    payment_status: "Pending",
    generated_at: new Date().toISOString(),
  };
}

module.exports = {
  calculateStatutoryFees,
};
