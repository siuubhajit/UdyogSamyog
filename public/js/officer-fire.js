/**
 * Fire Officer Controller - Directorate of Maharashtra Fire Services
 * Phase 2: Simultaneous Fire Safety & National Building Code (Part 4) Scrutiny
 */

let allApplications = [];
let activeAppId = null;

async function initFirePortal() {
  await guard("official");
  await loadApplications();
  setupEventListeners();
  runFireCalc();
}

async function loadApplications() {
  try {
    const apps = await api("/api/applications");
    allApplications = apps;
    renderKPIs();
    renderApplicationsTable();
  } catch (err) {
    console.error("Failed to load Fire applications:", err);
  }
}

function getStageDecision(a, dept) {
  if (!a) return null;
  try {
    const data = typeof a.stage_statuses === "string" ? JSON.parse(a.stage_statuses || "{}") : (a.stage_statuses || {});
    return data[dept]?.decision || null;
  } catch (_) {
    return null;
  }
}

function renderKPIs() {
  const pendingFire = allApplications.filter(
    (a) =>
      (a.current_stage === "parallel_scrutiny" || a.current_stage === "fire") &&
      getStageDecision(a, "fire") !== "Approved",
  ).length;

  const fireApproved = allApplications.filter(
    (a) =>
      getStageDecision(a, "fire") === "Approved" ||
      a.status === "Approved",
  ).length;

  const kpiPending = document.getElementById("kpiPendingFire");
  if (kpiPending) kpiPending.textContent = pendingFire;

  const kpiApproved = document.getElementById("kpiApprovedFire");
  if (kpiApproved) kpiApproved.textContent = fireApproved;

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
    const wasFireProcessed = !!getStageDecision(a, "fire");
    return isParallelActive || wasFireProcessed || a.status === "Approved";
  });

  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.location || "").toLowerCase().includes(search),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--ink-muted);">
          No fire clearance dossiers currently awaiting scrutiny.
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

      const fireDecision = stageData.fire?.decision;
      const isAwaitingFire =
        a.current_stage === "parallel_scrutiny" && !fireDecision;

      let statusBadge = "";
      if (fireDecision === "Approved") {
        statusBadge = `<span class="badge green">Fire Clearance Sanctioned</span>`;
      } else if (isAwaitingFire) {
        statusBadge = `<span class="badge yellow" style="font-weight:700">Phase 2: Simultaneous Review Active</span>`;
      } else if (a.current_stage === "mpcb") {
        statusBadge = `<span class="badge gray">Queued (Awaiting Environmental Clearance)</span>`;
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
          <div style="font-size:0.75rem; color:var(--ink-light)">Risk Tier: <b>${a.risk_tier}</b></div>
        </td>
        <td>
          <div>Land: <b>${a.land_size || 1.0} Acres</b></div>
          <div style="font-size:0.75rem; color:var(--ink-light)">Required Perimeter: 6m Driveway</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectFireDossier(${a.id})">
              🚒 View Fire Plan PDF
            </button>
            ${
              isAwaitingFire
                ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openFireDecisionModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}')">
                     🔥 Grant Fire Clearance
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

async function inspectFireDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;

    const modal = document.getElementById("fireInspectModal");
    if (!modal) return;

    document.getElementById("modalInspectAppNo").textContent =
      data.application_no;
    document.getElementById("modalInspectCompany").textContent =
      data.company_name;
    document.getElementById("modalInspectRisk").textContent =
      `${data.risk_tier} Hazard · ${data.industry_category}`;
    document.getElementById("modalInspectLand").textContent =
      `${data.land_size || 1.0} Acres`;

    // Render Fire Safety Plan PDF
    const firePlan =
      data.plans?.fireSafety ||
      (data.documents || []).find(
        (d) =>
          d.plan_type === "fire_safety_plan" ||
          d.document_type?.toLowerCase().includes("fire") ||
          d.document_type?.toLowerCase().includes("hydrant") ||
          d.document_type?.toLowerCase().includes("evacuation"),
      );

    const planBox = document.getElementById("modalFirePlanContainer");
    if (firePlan) {
      planBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fef2f2; border:1px solid #fecaca; padding:12px 16px; border-radius:6px; margin-bottom:12px;">
          <div>
            <div style="font-weight:700; color:#991b1b;">🚒 ${firePlan.original_name}</div>
            <div style="font-size:0.78rem; color:#b91c1c;">Uploaded Fire Hydrant & Evacuation Layout Plan (${formatBytes(firePlan.size)})</div>
          </div>
          <a class="btn sm" style="background:#dc2626; color:#fff;" href="/api/documents/${firePlan.id}/view" target="_blank">
            ↗ Open Fire Plan PDF
          </a>
        </div>
        <iframe src="/api/documents/${firePlan.id}/view" style="width:100%; height:320px; border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
    } else {
      planBox.innerHTML = `
        <div style="padding:20px; text-align:center; background:#fff7ed; border:1px dashed #fed7aa; border-radius:6px; color:#c2410c;">
          ⚠️ No Fire Hydrant & Evacuation Layout Plan PDF attached yet.
        </div>
      `;
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openFireDecisionModal(id, appNo, companyName) {
  activeAppId = id;
  document.getElementById("fireModalAppNo").textContent = appNo;
  document.getElementById("fireModalCompany").textContent = companyName;
  document.getElementById("fireModalRemarks").value = "";
  document.getElementById("fireModal").style.display = "flex";
}

async function submitFireDecision(decision) {
  if (!activeAppId) return;
  const remarks = document.getElementById("fireModalRemarks").value.trim();

  try {
    const res = await api(`/api/applications/${activeAppId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        targetDept: "fire",
        remarks:
          remarks ||
          `Provisional Fire Safety Clearance Certificate granted under Maharashtra Fire Prevention and Life Safety Measures Act 2006.`,
      }),
    });

    alert(`Success: ${res.message}`);
    closeModals();
    await loadApplications();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function runFireCalc() {
  const hazard = document.getElementById("calcHazardGrading")?.value || "medium";
  const builtUp =
    parseFloat(document.getElementById("calcBuiltUpArea")?.value) || 3000;

  let tankKl = 100;
  let pumpLpm = 2280;

  if (hazard === "low") {
    tankKl = builtUp > 5000 ? 100 : 50;
    pumpLpm = 1620;
  } else if (hazard === "medium") {
    tankKl = builtUp > 5000 ? 150 : 100;
    pumpLpm = 2280;
  } else {
    // High / Chemical
    tankKl = builtUp > 5000 ? 250 : 200;
    pumpLpm = 4500;
  }

  const tankEl = document.getElementById("calcStaticTank");
  if (tankEl) tankEl.textContent = `${tankKl} kL (Underground)`;

  const pumpEl = document.getElementById("calcPumpRating");
  if (pumpEl) pumpEl.textContent = `${pumpLpm} LPM @ 7 bar`;
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

  const calcH = document.getElementById("calcHazardGrading");
  const calcB = document.getElementById("calcBuiltUpArea");
  if (calcH) calcH.addEventListener("change", runFireCalc);
  if (calcB) calcB.addEventListener("input", runFireCalc);
}

window.initFirePortal = initFirePortal;
window.inspectFireDossier = inspectFireDossier;
window.openFireDecisionModal = openFireDecisionModal;
window.submitFireDecision = submitFireDecision;
window.closeModals = closeModals;
window.runFireCalc = runFireCalc;

