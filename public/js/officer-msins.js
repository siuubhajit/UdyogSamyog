/**
 * Apex Officer Controller - Directorate of Industries & Maharashtra State Innovation Society
 * Phase 3: Final Consolidated Single-Window Statutory Clearance
 */

let allApplications = [];
let allEnterprises = [];
let activeAppId = null;

async function initMsinsPortal() {
  await guard("official");
  await Promise.all([loadApplications(), loadEnterprises()]);
  setupEventListeners();
  runPsiCalc();
}

async function loadApplications(companySearch = "") {
  try {
    const url = companySearch
      ? `/api/applications?company=${encodeURIComponent(companySearch)}`
      : "/api/applications";
    const apps = await api(url);
    allApplications = apps;
    renderKPIs();
    renderApplicationsTable();
    renderCompanySearchResults(apps);
  } catch (err) {
    console.error("Failed to load State Innovation Society applications:", err);
  }
}

async function loadEnterprises() {
  try {
    const ents = await api("/api/admin/enterprises");
    allEnterprises = ents;
    renderEnterprisesTable();
  } catch (err) {
    console.warn("Notice: could not load enterprises blacklist list:", err);
  }
}

function renderKPIs() {
  const pendingFinal = allApplications.filter(
    (a) => a.current_stage === "msins" && a.status !== "Approved",
  ).length;

  const totalApproved = allApplications.filter(
    (a) => a.status === "Approved",
  ).length;

  const inParallel = allApplications.filter(
    (a) => a.current_stage === "parallel_scrutiny",
  ).length;

  const flaggedCount = allApplications.filter(
    (a) => a.status === "Flagged",
  ).length;

  const elPending = document.getElementById("kpiPendingApex");
  if (elPending) elPending.textContent = pendingFinal;

  const elApproved = document.getElementById("kpiApprovedApex");
  if (elApproved) elApproved.textContent = totalApproved;

  const elParallel = document.getElementById("kpiParallelReview");
  if (elParallel) elParallel.textContent = inParallel;

  const elFlagged = document.getElementById("kpiFlaggedQueries");
  if (elFlagged) elFlagged.textContent = flaggedCount;
}

function renderCompanySearchResults(apps) {
  const container = document.getElementById("companySearchResults");
  if (!container) return;

  const term = (
    document.getElementById("companySearchInput")?.value || ""
  ).trim();
  if (!term && apps.length > 5) {
    // Show top 5 recent when no search term is entered
    apps = apps.slice(0, 5);
  }

  if (apps.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px; color: var(--ink-muted); background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
        No enterprises found matching "<b>${escapeHtml(term)}</b>". Try searching by company name, GSTIN, or district.
      </div>`;
    return;
  }

  container.innerHTML = apps
    .map((a) => {
      let stageData = {};
      try {
        stageData = JSON.parse(a.stage_statuses || "{}");
      } catch (_) {}

      const mpcbOk = stageData.mpcb?.decision === "Approved";
      const midcOk = stageData.midc?.decision === "Approved";
      const dishOk = stageData.dish?.decision === "Approved";
      const fireOk = stageData.fire?.decision === "Approved";
      const msinsOk =
        stageData.msins?.decision === "Approved" || a.status === "Approved";

      const readyForFinal =
        (mpcbOk && midcOk && dishOk && fireOk) || a.current_stage === "msins";

      return `
      <div class="panel" style="margin-bottom:14px; border:1.5px solid ${msinsOk ? "#86efac" : readyForFinal ? "#fde047" : "#e2e8f0"}; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0; font-size:1.15rem; color:var(--navy);">${escapeHtml(a.company_name)}</h3>
              <span class="badge ${a.status === "Approved" ? "green" : a.status === "Flagged" ? "yellow" : a.status === "Rejected" ? "red" : "blue"}">
                ${a.status} (${a.current_stage || "mpcb"})
              </span>
              ${msinsOk ? '<span class="badge green" style="font-weight:700;">★ VERIFIED LICENSE ISSUED</span>' : ""}
            </div>
            <div style="font-size:0.82rem; color:var(--ink-light); margin-top:4px;">
              App No: <b>${a.application_no}</b> · GSTIN: <code>${a.registration_no || "PENDING"}</code> · ${a.district} (${a.location || "Industrial Area"})
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">
              Industry: <b>${a.industry_category}</b> · Hazard: <span class="badge gray">${a.hazard_level || "Standard"}</span> · Investment: ₹<b>${a.project_cost || 5} Cr</b>
            </div>
          </div>

          <div style="display:flex; gap:8px;">
            <button class="btn outline sm" onclick="inspectApexDossier(${a.id})">
              📑 Review All Plans & Remarks
            </button>
            ${
              msinsOk
                ? `<a class="btn green sm" href="/api/applications/${a.id}/certificate" target="_blank">
                     📜 View License Certificate
                   </a>`
                : readyForFinal
                  ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openFinalApprovalModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}')">
                       🏆 Grant Final Single-Window Clearance
                     </button>`
                  : `<button class="btn outline sm" style="color:#64748b;" onclick="inspectApexDossier(${a.id})">
                       ⏳ Awaiting Clearances
                     </button>`
            }
          </div>
        </div>

        <!-- 4 Confirming Department Clearance Badges -->
        <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; padding-top:12px; border-top:1px solid #f1f5f9;">
          <div class="matrix-pill ${mpcbOk ? "ok" : "pending"}">
            ${mpcbOk ? "✓" : "⏳"} Environment: <b>${mpcbOk ? "Approved" : "Pending"}</b>
          </div>
          <div class="matrix-pill ${midcOk ? "ok" : "pending"}">
            ${midcOk ? "✓" : "⏳"} Civil: <b>${midcOk ? "Approved" : "Pending"}</b>
          </div>
          <div class="matrix-pill ${dishOk ? "ok" : "pending"}">
            ${dishOk ? "✓" : "⏳"} Safety: <b>${dishOk ? "Approved" : "Pending"}</b>
          </div>
          <div class="matrix-pill ${fireOk ? "ok" : "pending"}">
            ${fireOk ? "✓" : "⏳"} Fire: <b>${fireOk ? "Approved" : "Pending"}</b>
          </div>
          <div class="matrix-pill ${msinsOk ? "ok" : readyForFinal ? "pending" : "flagged"}">
            ★ Apex: <b>${msinsOk ? "Sanctioned" : readyForFinal ? "Ready for Action" : "Waiting"}</b>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  const search = (
    document.getElementById("filterSearch")?.value || ""
  ).toLowerCase();

  let filtered = allApplications;
  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.district || "").toLowerCase().includes(search),
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--ink-muted);">
          No applications found.
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

      const mpcbOk = stageData.mpcb?.decision === "Approved";
      const midcOk = stageData.midc?.decision === "Approved";
      const dishOk = stageData.dish?.decision === "Approved";
      const fireOk = stageData.fire?.decision === "Approved";
      const isReadyForFinal =
        (mpcbOk && midcOk && dishOk && fireOk) || a.current_stage === "msins";
      const isApproved = a.status === "Approved";

      return `
      <tr>
        <td>
          <b>${a.application_no}</b>
          <div style="font-size:0.75rem; color:var(--ink-light);">${new Date(a.created_at).toLocaleDateString()}</div>
        </td>
        <td>
          <div style="font-weight:600">${a.company_name}</div>
          <div style="font-size:0.78rem; color:var(--ink-light)">${a.district} · ₹${a.project_cost || 5} Cr</div>
        </td>
        <td>
          <div style="display:flex; flex-wrap:wrap; gap:4px;">
            <span class="matrix-pill ${mpcbOk ? "ok" : "pending"}">Environment ${mpcbOk ? "✓" : "⏳"}</span>
            <span class="matrix-pill ${midcOk ? "ok" : "pending"}">Civil ${midcOk ? "✓" : "⏳"}</span>
            <span class="matrix-pill ${dishOk ? "ok" : "pending"}">Safety ${dishOk ? "✓" : "⏳"}</span>
            <span class="matrix-pill ${fireOk ? "ok" : "pending"}">Fire ${fireOk ? "✓" : "⏳"}</span>
          </div>
        </td>
        <td>
          <span class="badge ${isApproved ? "green" : a.status === "Flagged" ? "yellow" : a.status === "Rejected" ? "red" : "blue"}">
            ${isApproved ? "Approved & Licensed" : a.status}
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectApexDossier(${a.id})">
              📑 Dossier & PDFs
            </button>
            ${
              isApproved
                ? `<a class="btn green sm" href="/api/applications/${a.id}/certificate" target="_blank">
                     📜 Certificate
                   </a>`
                : isReadyForFinal
                  ? `<button class="btn saffron sm" style="font-weight:700;" onclick="openFinalApprovalModal(${a.id}, '${a.application_no}', '${escapeHtml(a.company_name)}')">
                       🏆 Grant Final Clearance
                     </button>`
                  : ""
            }
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function inspectApexDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;

    const modal = document.getElementById("apexInspectModal");
    if (!modal) return;

    document.getElementById("modalInspectAppNo").textContent =
      data.application_no;
    document.getElementById("modalInspectCompany").textContent =
      data.company_name;
    document.getElementById("modalInspectGstin").textContent =
      data.registration_no || "PENDING";
    document.getElementById("modalInspectLocation").textContent =
      `${data.district} · ${data.location}`;
    document.getElementById("modalInspectStage").textContent =
      data.current_stage || "mpcb";

    // Collated Plan PDFs
    const plansContainer = document.getElementById("modalAllPlansList");
    if (plansContainer) {
      const planItems = [
        {
          key: "environmental",
          title: "🌿 Environmental Management Plan & Effluent Scheme · Maharashtra Pollution Control Board",
          doc:
            data.plans?.environmental ||
            (data.documents || []).find(
              (d) =>
                d.plan_type === "environmental_plan" ||
                d.document_type?.toLowerCase().includes("effluent"),
            ),
        },
        {
          key: "civil",
          title: "📐 Civil Master Layout & Infrastructure · Maharashtra Industrial Development Corporation",
          doc:
            data.plans?.civil ||
            (data.documents || []).find(
              (d) =>
                d.plan_type === "civil_plan" ||
                d.document_type?.toLowerCase().includes("civil") ||
                d.document_type?.toLowerCase().includes("site"),
            ),
        },
        {
          key: "factorySafety",
          title: `🛡️ Factory Safety Blueprint · Directorate of Industrial Safety & Health - ${data.hazardLevel || "Standard"} Hazard`,
          doc:
            data.plans?.factorySafety ||
            (data.documents || []).find(
              (d) =>
                d.plan_type === "factory_safety_plan" ||
                d.document_type?.toLowerCase().includes("safety"),
            ),
        },
        {
          key: "fireSafety",
          title: "🚒 Fire Hydrant & Evacuation Layout · Directorate of Maharashtra Fire Services",
          doc:
            data.plans?.fireSafety ||
            (data.documents || []).find(
              (d) =>
                d.plan_type === "fire_safety_plan" ||
                d.document_type?.toLowerCase().includes("fire"),
            ),
        },
      ];

      plansContainer.innerHTML = planItems
        .map(
          (p) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; margin-bottom:8px;">
          <div>
            <div style="font-weight:700; font-size:0.9rem; color:var(--navy);">${p.title}</div>
            <div style="font-size:0.78rem; color:var(--ink-light);">
              ${p.doc ? `File: <b>${p.doc.original_name}</b> (${formatBytes(p.doc.size)})` : "⚠️ Plan PDF pending submission"}
            </div>
          </div>
          ${
            p.doc
              ? `<a class="btn outline sm" href="/api/documents/${p.doc.id}/view" target="_blank">
                   ↗ View PDF
                 </a>`
              : '<span class="badge gray">Not Uploaded</span>'
          }
        </div>
      `,
        )
        .join("");
    }

    // Confirming Department Remarks
    const remarksContainer = document.getElementById(
      "modalDepartmentRemarksList",
    );
    if (remarksContainer) {
      const stages = data.stageStatuses || {};
      const depts = [
        {
          code: "mpcb",
          name: "Maharashtra Pollution Control Board (Phase 1 Environmental Gateway)",
          info: stages.mpcb,
          icon: "🌿",
        },
        {
          code: "midc",
          name: "Maharashtra Industrial Development Corporation (Phase 2 Civil & Infrastructure)",
          info: stages.midc,
          icon: "📐",
        },
        {
          code: "dish",
          name: "Directorate of Industrial Safety & Health (Phase 2 Factory Safety)",
          info: stages.dish,
          icon: "🛡️",
        },
        {
          code: "fire",
          name: "Directorate of Maharashtra Fire Services (Phase 2 Life Safety Clearance)",
          info: stages.fire,
          icon: "🚒",
        },
      ];

      remarksContainer.innerHTML = depts
        .map(
          (d) => `
        <div style="padding:10px 14px; background:${d.info?.decision === "Approved" ? "#f0fdf4" : "#fefce8"}; border-left:4px solid ${d.info?.decision === "Approved" ? "#16a34a" : "#ca8a04"}; border-radius:4px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b>${d.icon} ${d.name}</b>
            <span class="badge ${d.info?.decision === "Approved" ? "green" : "yellow"}">${d.info?.decision || "Pending Review"}</span>
          </div>
          <div style="font-size:0.82rem; color:#334155; margin-top:4px;">
            ${d.info?.remarks || "No official remarks logged yet."}
          </div>
          ${d.info?.officer ? `<div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Decided by: ${d.info.officer} · ${new Date(d.info.decided_at).toLocaleString()}</div>` : ""}
        </div>
      `,
        )
        .join("");
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openFinalApprovalModal(id, appNo, companyName) {
  activeAppId = id;
  document.getElementById("finalModalAppNo").textContent = appNo;
  document.getElementById("finalModalCompany").textContent = companyName;
  document.getElementById("finalModalRemarks").value = "";
  document.getElementById("finalApprovalModal").style.display = "flex";
}

async function submitFinalApexDecision(decision) {
  if (!activeAppId) return;
  const remarks = document.getElementById("finalModalRemarks").value.trim();

  try {
    const res = await api(`/api/applications/${activeAppId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        targetDept: "msins",
        remarks:
          remarks ||
          `Final Single-Window Statutory Clearance granted by Directorate of Industries & State Innovation Society Apex Authority.`,
      }),
    });

    alert(`Success: ${res.message}`);
    closeModals();
    await loadApplications();
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function renderEnterprisesTable() {
  const tbody = document.getElementById("enterprisesTableBody");
  if (!tbody) return;

  tbody.innerHTML = allEnterprises
    .map(
      (ent) => `
    <tr>
      <td><b>${escapeHtml(ent.company_name)}</b></td>
      <td><code>${escapeHtml(ent.registration_no || "N/A")}</code></td>
      <td>${escapeHtml(ent.email)}</td>
      <td>
        <span class="badge ${ent.is_banned ? "red" : "green"}">
          ${ent.is_banned ? "Statutorily Banned" : "Active Enterprise"}
        </span>
      </td>
      <td>
        ${
          ent.is_banned
            ? `<button class="btn sm" style="background:#059669; color:#fff;" onclick="unbanEnterprise(${ent.id})">Lift Ban</button>`
            : `<button class="btn sm" style="background:#dc2626; color:#fff;" onclick="openBanModal(${ent.id})">Blacklist Enterprise</button>`
        }
      </td>
    </tr>
  `,
    )
    .join("");
}

async function unbanEnterprise(id) {
  const ent = allEnterprises.find((x) => x.id === id);
  if (
    !confirm(
      `Lift statutory ban and restore Single-Window access for '${ent?.company_name}'?`,
    )
  )
    return;

  try {
    await api(`/api/admin/enterprises/${id}/unban`, { method: "POST" });
    alert("Enterprise ban lifted.");
    await loadEnterprises();
  } catch (err) {
    alert(err.message);
  }
}

function openBanModal(id) {
  activeAppId = id;
  const ent = allEnterprises.find((x) => x.id === id);
  document.getElementById("banModalCompany").textContent =
    ent?.company_name || "";
  document.getElementById("banModalReason").value = "";
  document.getElementById("banModal").style.display = "flex";
}

async function submitBan() {
  if (!activeAppId) return;
  const reason = document.getElementById("banModalReason").value.trim();
  if (!reason) {
    alert("Please provide the statutory reason for blacklisting.");
    return;
  }

  try {
    await api(`/api/admin/enterprises/${activeAppId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    alert("Enterprise statutorily blacklisted.");
    closeModals();
    await loadEnterprises();
  } catch (err) {
    alert(err.message);
  }
}

function runPsiCalc() {
  const zone = document.getElementById("calcPsiZone")?.value || "D";
  const capital =
    parseFloat(document.getElementById("calcPsiCapital")?.value) || 10;
  const category =
    document.getElementById("calcPsiCategory")?.value || "Small";

  let subsidyRate = 0.3;
  if (zone === "A") subsidyRate = 0.1;
  else if (zone === "B") subsidyRate = 0.2;
  else if (zone === "C") subsidyRate = 0.3;
  else if (zone === "D") subsidyRate = 0.4;
  else if (zone === "D_plus") subsidyRate = 0.5;
  else if (zone === "Aspirational") subsidyRate = 0.6;

  if (category === "Micro") subsidyRate += 0.05;

  const eligibleSubsidy = (capital * subsidyRate).toFixed(2);
  const sgstPeriod =
    zone === "D_plus" || zone === "Aspirational" ? "10 Years" : "7 Years";

  const subEl = document.getElementById("calcEligibleSubsidy");
  if (subEl) subEl.textContent = `₹${eligibleSubsidy} Crores (${(subsidyRate * 100).toFixed(0)}%)`;

  const sgstEl = document.getElementById("calcSgstPeriod");
  if (sgstEl) sgstEl.textContent = `${sgstPeriod} (100% SGST Refund)`;
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
  const companySearch = document.getElementById("companySearchInput");
  if (companySearch) {
    companySearch.addEventListener("keyup", (e) => {
      const val = e.target.value.trim();
      const filtered = allApplications.filter(
        (a) =>
          (a.company_name || "").toLowerCase().includes(val.toLowerCase()) ||
          (a.application_no || "").toLowerCase().includes(val.toLowerCase()) ||
          (a.registration_no || "").toLowerCase().includes(val.toLowerCase()) ||
          (a.district || "").toLowerCase().includes(val.toLowerCase()),
      );
      renderCompanySearchResults(filtered);
    });
  }

  const filterSearch = document.getElementById("filterSearch");
  if (filterSearch) {
    filterSearch.addEventListener("keyup", (e) => {
      if (e.key === "Enter") renderApplicationsTable();
    });
  }

  const calcZone = document.getElementById("calcPsiZone");
  const calcCap = document.getElementById("calcPsiCapital");
  const calcCat = document.getElementById("calcPsiCategory");
  if (calcZone) calcZone.addEventListener("change", runPsiCalc);
  if (calcCap) calcCap.addEventListener("input", runPsiCalc);
  if (calcCat) calcCat.addEventListener("change", runPsiCalc);
}

window.initMsinsPortal = initMsinsPortal;
window.loadApplications = loadApplications;
window.inspectApexDossier = inspectApexDossier;
window.openFinalApprovalModal = openFinalApprovalModal;
window.submitFinalApexDecision = submitFinalApexDecision;
window.unbanEnterprise = unbanEnterprise;
window.openBanModal = openBanModal;
window.submitBan = submitBan;
window.closeModals = closeModals;
window.runPsiCalc = runPsiCalc;

