/**
 * MIDC Officer Controller - Maharashtra Industrial Development Corporation
 * Phase 2: Simultaneous Civil Infrastructure & Building Plan Scrutiny
 */

let allApplications = [];
let currentZone = "all";
let activeAppId = null;

async function initMidcPortal() {
  await guard("official");
  await loadApplications();
  setupEventListeners();
  runFarCalc();
}

async function loadApplications() {
  try {
    const apps = await api("/api/applications");
    allApplications = apps;
    renderKPIs();
    renderApplicationsTable();
  } catch (err) {
    console.error("Failed to load MIDC applications:", err);
  }
}

function renderKPIs() {
  const pendingCivil = allApplications.filter(
    (a) =>
      (a.current_stage === "parallel_scrutiny" || a.current_stage === "midc") &&
      !a.stage_statuses?.includes('"midc":{"decision":"Approved"'),
  ).length;

  const civilApproved = allApplications.filter(
    (a) =>
      a.stage_statuses?.includes('"midc":{"decision":"Approved"') ||
      a.status === "Approved",
  ).length;

  const kpiPending = document.getElementById("kpiPendingCivil");
  if (kpiPending) kpiPending.textContent = pendingCivil;

  const kpiApproved = document.getElementById("kpiApprovedCivil");
  if (kpiApproved) kpiApproved.textContent = civilApproved;

  const kpiTotal = document.getElementById("kpiTotalDossiers");
  if (kpiTotal) kpiTotal.textContent = allApplications.length;
}

function filterZone(zone) {
  currentZone = zone;
  document.querySelectorAll(".cluster-chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.zone === zone);
  });
  renderApplicationsTable();
}

function renderApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  const search = (
    document.getElementById("filterSearch")?.value || ""
  ).toLowerCase();

  let filtered = allApplications.filter((a) => {
    const isParallelActive = a.current_stage === "parallel_scrutiny";
    const wasMidcProcessed = a.stage_statuses?.includes('"midc"');
    return isParallelActive || wasMidcProcessed || a.status === "Approved";
  });

  if (currentZone !== "all") {
    filtered = filtered.filter(
      (a) =>
        (a.location || "").toLowerCase().includes(currentZone.toLowerCase()) ||
        (a.district || "").toLowerCase().includes(currentZone.toLowerCase()),
    );
  }

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
          No civil engineering dossiers currently matching criteria.
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

      const midcDecision = stageData.midc?.decision;
      const isAwaitingCivil =
        a.current_stage === "parallel_scrutiny" && !midcDecision;

      let statusBadge = "";
      if (midcDecision === "Approved") {
        statusBadge = `<span class="badge green">Civil Plan Sanctioned</span>`;
      } else if (isAwaitingCivil) {
        statusBadge = `<span class="badge yellow" style="font-weight:700">Phase 2: Simultaneous Review Pending</span>`;
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
          <div>Plot Area: <b>${a.land_size || 1.0} Acres</b></div>
          <div style="font-size:0.75rem; color:var(--ink-light)">Built-Up Est.: ~${((a.land_size || 1.0) * 4046.86 * 0.5).toFixed(0)} sq.m</div>
        </td>
        <td>
          <div>Investment: ₹<b>${a.project_cost || 5} Cr</b></div>
          <div style="font-size:0.75rem; color:var(--ink-light)">Power: ${a.electricity || 100} kVA</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectCivilDossier(${a.id})">
              📐 View Civil Plan PDF
            </button>
            ${
              isAwaitingCivil
                ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openCivilDecisionModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}')">
                     ✅ Sanction Civil Plan
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

async function inspectCivilDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;

    const modal = document.getElementById("civilInspectModal");
    if (!modal) return;

    document.getElementById("modalInspectAppNo").textContent =
      data.application_no;
    document.getElementById("modalInspectCompany").textContent =
      data.company_name;
    document.getElementById("modalInspectLocation").textContent =
      `${data.district} · ${data.location}`;
    document.getElementById("modalInspectLand").textContent =
      `${data.land_size || 1.0} Acres (~${((data.land_size || 1.0) * 4046.86).toFixed(0)} sq.m)`;

    // Render Civil Plan PDF
    const civilPlan =
      data.plans?.civil ||
      (data.documents || []).find(
        (d) =>
          d.plan_type === "civil_plan" ||
          d.document_type?.toLowerCase().includes("site") ||
          d.document_type?.toLowerCase().includes("civil") ||
          d.document_type?.toLowerCase().includes("layout"),
      );

    const planBox = document.getElementById("modalCivilPlanContainer");
    if (civilPlan) {
      planBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#eff6ff; border:1px solid #bfdbfe; padding:12px 16px; border-radius:6px; margin-bottom:12px;">
          <div>
            <div style="font-weight:700; color:#1e40af;">📐 ${civilPlan.original_name}</div>
            <div style="font-size:0.78rem; color:#2563eb;">Uploaded Civil Infrastructure & Building Layout Plan (${formatBytes(civilPlan.size)})</div>
          </div>
          <a class="btn sm" style="background:#2563eb; color:#fff;" href="/api/documents/${civilPlan.id}/view" target="_blank">
            ↗ Open Civil Plan PDF
          </a>
        </div>
        <iframe src="/api/documents/${civilPlan.id}/view" style="width:100%; height:320px; border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
    } else {
      planBox.innerHTML = `
        <div style="padding:20px; text-align:center; background:#fef2f2; border:1px dashed #fca5a5; border-radius:6px; color:#b91c1c;">
          ⚠️ No statutory Civil Infrastructure Plan PDF attached yet.
        </div>
      `;
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openCivilDecisionModal(id, appNo, companyName) {
  activeAppId = id;
  document.getElementById("civilModalAppNo").textContent = appNo;
  document.getElementById("civilModalCompany").textContent = companyName;
  document.getElementById("civilModalRemarks").value = "";
  document.getElementById("civilModal").style.display = "flex";
}

async function submitCivilDecision(decision) {
  if (!activeAppId) return;
  const remarks = document.getElementById("civilModalRemarks").value.trim();

  try {
    const res = await api(`/api/applications/${activeAppId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        targetDept: "midc",
        remarks:
          remarks ||
          `MIDC Civil Infrastructure & Building Plan sanction granted.`,
      }),
    });

    alert(`Success: ${res.message}`);
    closeModals();
    await loadApplications();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function runFarCalc() {
  const plotArea =
    parseFloat(document.getElementById("calcPlotArea")?.value) || 2000;
  const builtUp =
    parseFloat(document.getElementById("calcBuiltUp")?.value) || 1800;

  const consumedFar = (builtUp / plotArea).toFixed(2);
  const maxFar = 1.0;
  const coveragePercent = Math.min(
    100,
    ((builtUp / 2 / plotArea) * 100).toFixed(1),
  );

  const farEl = document.getElementById("calcConsumedFar");
  if (farEl) {
    farEl.textContent = `${consumedFar} / ${maxFar}`;
    farEl.style.color =
      parseFloat(consumedFar) <= maxFar ? "var(--emerald)" : "var(--crimson)";
  }

  const covEl = document.getElementById("calcCoverage");
  if (covEl) covEl.textContent = `${coveragePercent}%`;
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

  const calcPlot = document.getElementById("calcPlotArea");
  const calcBuilt = document.getElementById("calcBuiltUp");
  if (calcPlot) calcPlot.addEventListener("input", runFarCalc);
  if (calcBuilt) calcBuilt.addEventListener("input", runFarCalc);
}

window.initMidcPortal = initMidcPortal;
window.filterZone = filterZone;
window.inspectCivilDossier = inspectCivilDossier;
window.openCivilDecisionModal = openCivilDecisionModal;
window.submitCivilDecision = submitCivilDecision;
window.closeModals = closeModals;
window.runFarCalc = runFarCalc;

