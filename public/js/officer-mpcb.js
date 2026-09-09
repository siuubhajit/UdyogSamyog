/**
 * Environmental Officer Controller - Maharashtra Pollution Control Board
 * Phase 1: Environmental Clearance & Consent to Establish
 */

let allApplications = [];
let currentFilter = "all";
let currentCategory = "all";
let activeAppId = null;

async function initMpcbPortal() {
  await guard("official");
  await loadApplications();
  setupEventListeners();
  runMpcbCalc();
}

async function loadApplications() {
  try {
    const apps = await api("/api/applications");
    allApplications = apps;
    renderKPIs();
    renderApplicationsTable();
  } catch (err) {
    console.error("Failed to load Environmental applications:", err);
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
  const pendingPhase1 = allApplications.filter(
    (a) => a.current_stage === "mpcb" && a.status !== "Rejected",
  ).length;
  const redCategory = allApplications.filter(
    (a) => a.risk_tier === "Red",
  ).length;
  const cteCleared = allApplications.filter(
    (a) =>
      getStageDecision(a, "mpcb") === "Approved" ||
      a.status === "Approved",
  ).length;

  const kpiPending = document.getElementById("kpiPendingPhase1");
  if (kpiPending) kpiPending.textContent = pendingPhase1;

  const kpiRed = document.getElementById("kpiRedCategory");
  if (kpiRed) kpiRed.textContent = redCategory;

  const kpiApproved = document.getElementById("kpiApprovedCTE");
  if (kpiApproved) kpiApproved.textContent = cteCleared;

  const kpiTotal = document.getElementById("kpiTotalDossiers");
  if (kpiTotal) kpiTotal.textContent = allApplications.length;
}

function filterCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll(".category-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === cat);
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
    const isMpcbActive = a.current_stage === "mpcb";
    const wasMpcbProcessed = !!getStageDecision(a, "mpcb");
    return isMpcbActive || wasMpcbProcessed || a.status === "Approved";
  });

  if (currentCategory !== "all") {
    filtered = filtered.filter((a) => a.risk_tier === currentCategory);
  }

  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.industry_category || "").toLowerCase().includes(search),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--ink-muted);">
          No environmental clearance applications found matching filters.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((a) => {
      const isPhase1Pending = a.current_stage === "mpcb";
      let stageData = {};
      try {
        stageData = JSON.parse(a.stage_statuses || "{}");
      } catch (_) {}

      const mpcbDecision = stageData.mpcb?.decision;
      const riskClass =
        a.risk_tier === "Red"
          ? "risk-red"
          : a.risk_tier === "Orange"
            ? "risk-orange"
            : a.risk_tier === "Green"
              ? "risk-green"
              : "badge gray";

      let statusBadge = "";
      if (mpcbDecision === "Approved") {
        statusBadge = `<span class="badge green">Consent to Establish Cleared (Phase 1 Approved)</span>`;
      } else if (isPhase1Pending) {
        statusBadge = `<span class="badge yellow" style="font-weight:700">Phase 1: Awaiting Environmental Clearance</span>`;
      } else if (a.status === "Rejected") {
        statusBadge = `<span class="badge red">Deficient / Rejected</span>`;
      } else {
        statusBadge = `<span class="badge blue">Forwarded to Phase 2</span>`;
      }

      return `
      <tr>
        <td>
          <b>${a.application_no}</b>
          <div style="font-size:0.75rem; color:var(--ink-light);">${new Date(a.created_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div style="font-weight:600">${a.company_name || "Enterprise"}</div>
          <div style="font-size:0.78rem; color:var(--ink-light)">${a.district || "Maharashtra"} · ${a.location || "Industrial Area"}</div>
        </td>
        <td>
          <div>${a.industry_category}</div>
          <span class="risk-tag ${riskClass}" style="margin-top:4px; display:inline-block;">${a.risk_tier || "Orange"} Category</span>
        </td>
        <td>
          <div style="font-size:0.85rem">Water: <b>${a.water_use || 10} KLD</b></div>
          <div style="font-size:0.85rem">Power: <b>${a.electricity || 100} kVA</b></div>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectMpcbDossier(${a.id})">
              🔍 Scrutinize Plan & Dossier
            </button>
            ${
              isPhase1Pending
                ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openCteDecisionModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}')">
                     🌿 Grant Consent to Establish / Decision
                   </button>`
                : `<a href="verification.html?id=${a.id}" class="btn sm" style="font-size:0.75rem; background:#f1f5f9; color:#334155;">
                     View Full History
                   </a>`
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function inspectMpcbDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;

    const modal = document.getElementById("mpcbInspectModal");
    if (!modal) return;

    document.getElementById("modalInspectAppNo").textContent =
      data.application_no;
    document.getElementById("modalInspectCompany").textContent =
      data.company_name;
    document.getElementById("modalInspectCategory").textContent =
      `${data.industry_category} (${data.risk_tier} Category)`;
    document.getElementById("modalInspectWater").textContent =
      `${data.water_use || 10} KLD`;
    document.getElementById("modalInspectHazard").textContent =
      data.hazardLevel || (data.hazardous ? "Hazardous Process" : "General");

    // Render Environmental Plan PDF preview
    const envPlan =
      data.plans?.environmental ||
      (data.documents || []).find(
        (d) =>
          d.plan_type === "environmental_plan" ||
          d.document_type?.toLowerCase().includes("effluent") ||
          d.document_type?.toLowerCase().includes("water"),
      );

    const planBox = document.getElementById("modalEnvPlanContainer");
    if (envPlan) {
      planBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#ecfdf5; border:1px solid #a7f3d0; padding:12px 16px; border-radius:6px; margin-bottom:12px;">
          <div>
            <div style="font-weight:700; color:#065f46;">📄 ${envPlan.original_name}</div>
            <div style="font-size:0.78rem; color:#047857;">Uploaded Statutory Environmental Management & Effluent Treatment Plan (${formatBytes(envPlan.size)})</div>
          </div>
          <a class="btn sm" style="background:#059669; color:#fff;" href="/api/documents/${envPlan.id}/view" target="_blank">
            ↗ Open Environmental Plan PDF
          </a>
        </div>
        <iframe src="/api/documents/${envPlan.id}/view" style="width:100%; height:320px; border:1px solid #cbd5e1; border-radius:6px;"></iframe>
      `;
    } else {
      planBox.innerHTML = `
        <div style="padding:20px; text-align:center; background:#fef2f2; border:1px dashed #fca5a5; border-radius:6px; color:#b91c1c;">
          ⚠️ No statutory Environmental Plan PDF attached to this dossier yet.
        </div>
      `;
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openCteDecisionModal(id, appNo, companyName) {
  activeAppId = id;
  document.getElementById("cteModalAppNo").textContent = appNo;
  document.getElementById("cteModalCompany").textContent = companyName;
  document.getElementById("cteModalRemarks").value = "";
  if (typeof resetChecklist === "function") {
    resetChecklist("mpcb", 4);
  }
  document.getElementById("cteModal").style.display = "flex";
}

async function submitMpcbDecision(decision) {
  if (!activeAppId) return;
  const remarks = document.getElementById("cteModalRemarks").value.trim();

  if (decision === "Approved") {
    const checkboxes = document.querySelectorAll(".mpcb-chk");
    const checked = Array.from(checkboxes).filter((cb) => cb.checked).length;
    if (checkboxes.length > 0 && checked < checkboxes.length) {
      alert(`Statutory Requirement: Please verify and tick all ${checkboxes.length} environmental statutory checklist items before granting Consent to Establish.`);
      return;
    }
  }

  if (decision === "Query" && !remarks) {
    alert("Please provide the clarification query message for the applicant.");
    return;
  }
  if (decision === "Rejected" && !remarks) {
    alert("Please provide statutory grounds for environmental Consent to Establish refusal.");
    return;
  }

  try {
    const res = await api(`/api/applications/${activeAppId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        remarks:
          remarks ||
          `Consent to Establish granted under Water & Air Pollution Control Acts.`,
      }),
    });

    alert(`Success: ${res.message}`);
    closeModals();
    await loadApplications();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function runMpcbCalc() {
  const water =
    parseFloat(document.getElementById("calcWaterUse")?.value) || 10;
  const so2 = parseFloat(document.getElementById("calcSo2Rate")?.value) || 5;

  // Effluent treatment capacity recommendation (80% of industrial water consumption + 20% surge capacity)
  const etpCapacity = Math.ceil(water * 0.8 * 1.2);

  // Statutory Stack Height Formula: H = 14 * (Q_SO2)^0.3
  const stackHeight = Math.max(15, (14 * Math.pow(so2, 0.3)).toFixed(1));

  const etpEl = document.getElementById("calcEtpCapacity");
  if (etpEl) etpEl.textContent = `${etpCapacity} KLD`;

  const stackEl = document.getElementById("calcStackHeight");
  if (stackEl) stackEl.textContent = `${stackHeight} Meters`;
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

  const calcWater = document.getElementById("calcWaterUse");
  const calcSo2 = document.getElementById("calcSo2Rate");
  if (calcWater) calcWater.addEventListener("input", runMpcbCalc);
  if (calcSo2) calcSo2.addEventListener("input", runMpcbCalc);
}

window.initMpcbPortal = initMpcbPortal;
window.filterCategory = filterCategory;
window.inspectMpcbDossier = inspectMpcbDossier;
window.openCteDecisionModal = openCteDecisionModal;
window.submitMpcbDecision = submitMpcbDecision;
window.closeModals = closeModals;
window.runMpcbCalc = runMpcbCalc;

