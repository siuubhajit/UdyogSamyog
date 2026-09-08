/**
 * DISH Officer Controller - Directorate of Industrial Safety & Health
 * Phase 2: Simultaneous Factory Safety Blueprint Scrutiny & Hazard Assessment
 */

let allApplications = [];
let activeAppId = null;

async function initDishPortal() {
  await guard("official");
  await loadApplications();
  setupEventListeners();
  runDishCalc();
}

async function loadApplications() {
  try {
    const apps = await api("/api/applications");
    allApplications = apps;
    renderKPIs();
    renderApplicationsTable();
  } catch (err) {
    console.error("Failed to load DISH applications:", err);
  }
}

function renderKPIs() {
  const pendingSafety = allApplications.filter(
    (a) =>
      (a.current_stage === "parallel_scrutiny" || a.current_stage === "dish") &&
      !a.stage_statuses?.includes('"dish":{"decision":"Approved"'),
  ).length;

  const chemicalHazard = allApplications.filter(
    (a) =>
      (a.hazard_level || "").toLowerCase().includes("chemical") || a.hazardous,
  ).length;

  const safetyApproved = allApplications.filter(
    (a) =>
      a.stage_statuses?.includes('"dish":{"decision":"Approved"') ||
      a.status === "Approved",
  ).length;

  const kpiPending = document.getElementById("kpiPendingSafety");
  if (kpiPending) kpiPending.textContent = pendingSafety;

  const kpiHazard = document.getElementById("kpiHazardChemical");
  if (kpiHazard) kpiHazard.textContent = chemicalHazard;

  const kpiApproved = document.getElementById("kpiApprovedSafety");
  if (kpiApproved) kpiApproved.textContent = safetyApproved;

  const kpiTotal = document.getElementById("kpiTotalDossiers");
  if (kpiTotal) kpiTotal.textContent = allApplications.length;
}

function renderApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  const search = (
    document.getElementById("filterSearch")?.value || ""
  ).toLowerCase();

  let filtered = allApplications.filter((a) => {
    const isParallelActive = a.current_stage === "parallel_scrutiny";
    const wasDishProcessed = a.stage_statuses?.includes('"dish"');
    return isParallelActive || wasDishProcessed || a.status === "Approved";
  });

  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.hazard_level || "").toLowerCase().includes(search) ||
        (a.industry_category || "").toLowerCase().includes(search),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--ink-muted);">
          No factory safety dossiers currently awaiting scrutiny.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((a) => {
      let stageData = {};
      try {
        stageData = JSON.parse(a.stage_statuses || "{}");
      } catch (_) {}

      const dishDecision = stageData.dish?.decision;
      const isAwaitingSafety =
        a.current_stage === "parallel_scrutiny" && !dishDecision;

      const hazardText =
        a.hazard_level ||
        (a.hazardous
          ? "Chemical Hazard (High Risk)"
          : "Low Risk / General Manufacturing");
      let hazardBadgeClass = "badge blue";
      if (hazardText.toLowerCase().includes("chemical"))
        hazardBadgeClass = "risk-tag risk-red";
      else if (hazardText.toLowerCase().includes("thermal"))
        hazardBadgeClass = "risk-tag risk-orange";
      else if (hazardText.toLowerCase().includes("metallurgical"))
        hazardBadgeClass = "badge purple";

      let statusBadge = "";
      if (dishDecision === "Approved") {
        statusBadge = `<span class="badge green">Factory Plan Endorsed</span>`;
      } else if (isAwaitingSafety) {
        statusBadge = `<span class="badge yellow" style="font-weight:700">Phase 2: Simultaneous Review Active</span>`;
      } else if (a.current_stage === "mpcb") {
        statusBadge = `<span class="badge gray">Queued (Awaiting MPCB)</span>`;
      } else {
        statusBadge = `<span class="badge blue">Processed (${a.status})</span>`;
      }

      return `
      <tr>
        <td>
          <b>${a.application_no}</b>
          <div style="font-size:0.75rem; color:var(--ink-light);">${new Date(a.created_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div style="font-weight:600">${a.company_name}</div>
          <div style="font-size:0.78rem; color:var(--ink-light)">${a.district} · ${a.location}</div>
        </td>
        <td>
          <div>${a.industry_category}</div>
          <div style="margin-top:4px;"><span class="${hazardBadgeClass}">${hazardText}</span></div>
        </td>
        <td>
          <div>Workforce: <b>${a.employment_potential || 50} Workers</b></div>
          <div style="font-size:0.75rem; color:var(--ink-light)">
            ${(a.employment_potential || 50) >= 250 ? "⚠️ Canteen Mandatory" : "Canteen Optional"}
          </div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectSafetyDossier(${a.id})">
              🛡️ View Safety Plan PDF
            </button>
            ${
              isAwaitingSafety
                ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openSafetyDecisionModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}', '${escapeHtml(hazardText)}')">
                     ✅ Endorse Safety Plan
                   </button>`
                : `<a href="verification.html?id=${a.id}" class="btn sm" style="font-size:0.75rem; background:#f1f5f9; color:#334155;">
                     View Scrutiny
                   </a>`
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function inspectSafetyDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;

    const modal = document.getElementById("safetyInspectModal");
    if (!modal) return;

    document.getElementById("modalInspectAppNo").textContent =
      data.application_no;
    document.getElementById("modalInspectCompany").textContent =
      data.company_name;
    document.getElementById("modalInspectHazard").textContent =
      data.hazardLevel || (data.hazardous ? "Chemical Hazard" : "General");
    document.getElementById("modalInspectWorkers").textContent =
      `${data.employment_potential || 50} Workers`;

    // Render Factory Safety Plan PDF
    const safetyPlan =
      data.plans?.factorySafety ||
      data.documents.find(
        (d) =>
          d.plan_type === "factory_safety_plan" ||
          d.document_type?.toLowerCase().includes("factory") ||
          d.document_type?.toLowerCase().includes("safety") ||
          d.document_type?.toLowerCase().includes("machinery"),
      );

    const planBox = document.getElementById("modalSafetyPlanContainer");
    if (safetyPlan) {
      planBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fef2f2; border:1px solid #fecaca; padding:12px 16px; border-radius:6px; margin-bottom:12px;">
          <div>
            <div style="font-weight:700; color:#991b1b;">🛡️ ${safetyPlan.original_name}</div>
            <div style="font-size:0.78rem; color:#b91c1c;">Uploaded Factory Safety & Health Blueprint (${formatBytes(safetyPlan.size)})</div>
          </div>
          <a class="btn sm" style="background:#dc2626; color:#fff;" href="/api/documents/${safetyPlan.id}/view" target="_blank">
            ↗ Open Safety Plan PDF
          </a>
        </div>
        <iframe src="/api/documents/${safetyPlan.id}/view" style="width:100%; height:320px; border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
    } else {
      planBox.innerHTML = `
        <div style="padding:20px; text-align:center; background:#fff7ed; border:1px dashed #fed7aa; border-radius:6px; color:#c2410c;">
          ⚠️ No Factory Safety Blueprint PDF attached yet.
        </div>
      `;
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openSafetyDecisionModal(id, appNo, companyName, hazardLevel) {
  activeAppId = id;
  document.getElementById("safetyModalAppNo").textContent = appNo;
  document.getElementById("safetyModalCompany").textContent = companyName;
  document.getElementById("safetyModalHazard").textContent = hazardLevel;
  document.getElementById("safetyModalRemarks").value = "";
  document.getElementById("safetyModal").style.display = "flex";
}

async function submitSafetyDecision(decision) {
  if (!activeAppId) return;
  const remarks = document.getElementById("safetyModalRemarks").value.trim();

  try {
    const res = await api(`/api/applications/${activeAppId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        targetDept: "dish",
        remarks:
          remarks ||
          `DISH Factory Safety Blueprint approved under Factories Act 1948.`,
      }),
    });

    alert(`Success: ${res.message}`);
    closeModals();
    await loadApplications();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function runDishCalc() {
  const area = parseFloat(document.getElementById("calcHallArea")?.value) || 800;
  const height =
    parseFloat(document.getElementById("calcCeilingHeight")?.value) || 4.5;
  const workers =
    parseInt(document.getElementById("calcShiftWorkers")?.value, 10) || 40;

  // Total enclosed air volume (capped at max 4.2m under Section 16)
  const effHeight = Math.min(4.2, height);
  const totalVolume = area * effHeight;
  const volumePerWorker = (totalVolume / Math.max(1, workers)).toFixed(1);

  // Statutory requirement: 14.2 m3 per worker
  const isCompliant = parseFloat(volumePerWorker) >= 14.2;
  const maxAllowedWorkers = Math.floor(totalVolume / 14.2);

  const volEl = document.getElementById("calcVolumePerWorker");
  if (volEl) {
    volEl.textContent = `${volumePerWorker} m³ / worker (Min: 14.2 m³)`;
    volEl.style.color = isCompliant ? "var(--emerald)" : "var(--crimson)";
  }

  const maxWEl = document.getElementById("calcMaxWorkers");
  if (maxWEl) {
    maxWEl.textContent = `${maxAllowedWorkers} Workers Max`;
  }
}

function closeModals() {
  document
    .querySelectorAll(".modal")
    .forEach((m) => (m.style.display = "none"));
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setupEventListeners() {
  const searchInput = document.getElementById("filterSearch");
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") renderApplicationsTable();
    });
  }

  const calcArea = document.getElementById("calcHallArea");
  const calcH = document.getElementById("calcCeilingHeight");
  const calcW = document.getElementById("calcShiftWorkers");
  if (calcArea) calcArea.addEventListener("input", runDishCalc);
  if (calcH) calcH.addEventListener("input", runDishCalc);
  if (calcW) calcW.addEventListener("input", runDishCalc);
}

window.initDishPortal = initDishPortal;
window.inspectSafetyDossier = inspectSafetyDossier;
window.openSafetyDecisionModal = openSafetyDecisionModal;
window.submitSafetyDecision = submitSafetyDecision;
window.closeModals = closeModals;
window.runDishCalc = runDishCalc;

