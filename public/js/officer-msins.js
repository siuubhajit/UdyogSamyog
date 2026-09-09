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
    renderCompanySearchResults(apps, companySearch);
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

function renderCompanySearchResults(apps, explicitTerm = null) {
  const container = document.getElementById("companySearchResults");
  if (!container) return;

  const term = (
    explicitTerm !== null
      ? explicitTerm
      : document.getElementById("companySearchInput")?.value || ""
  ).trim();

  // If no search query was entered, display the clean search guide prompt (never auto-populate unapplied/random industries)
  if (!term) {
    container.innerHTML = `
      <div style="text-align:center; padding: 28px 16px; color: var(--ink-light); background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
        <div style="font-size:1.6rem; margin-bottom:6px;">🔎</div>
        <div style="font-weight:700; color:var(--navy); font-size:0.95rem; margin-bottom:4px;">Search Enterprise Clearances &amp; Licenses</div>
        <div style="font-size:0.82rem; color:var(--ink-muted); max-width:460px; margin:0 auto;">
          Enter an enterprise name (e.g. Sahyadri), GSTIN, or Application ID above to inspect live multi-departmental clearance milestones, statutory remarks, and license status.
        </div>
      </div>`;
    return;
  }

  const termLower = term.toLowerCase();

  const matchRegNo = (reg, query) => {
    if (!reg) return false;
    const r = reg.toLowerCase();
    return query.length >= 5 ? r.includes(query) : r.startsWith(query) || r === query;
  };

  // 1. Find matching applications from industries that HAVE APPLIED
  const matchedApps = (apps || []).filter(
    (a) =>
      (a.company_name || "").toLowerCase().includes(termLower) ||
      (a.application_no || "").toLowerCase().includes(termLower) ||
      matchRegNo(a.registration_no, termLower) ||
      (a.district || "").toLowerCase().includes(termLower),
  );

  // 2. Find registered enterprises matching the search that have NOT applied yet
  const unappliedMatches = (allEnterprises || []).filter((ent) => {
    const nameMatch = (ent.company_name || "").toLowerCase().includes(termLower);
    const regMatch = matchRegNo(ent.registration_no, termLower);
    const hasAppInApps = allApplications.some(
      (a) =>
        a.user_id === ent.id ||
        (a.company_name || "").trim().toLowerCase() === (ent.company_name || "").trim().toLowerCase(),
    );
    const hasAppCount = ent.applications_count && ent.applications_count > 0;
    return (nameMatch || regMatch) && !hasAppInApps && !hasAppCount;
  });

  if (matchedApps.length === 0 && unappliedMatches.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px; color: var(--ink-muted); background:#f8fafc; border-radius:8px; border:1px dashed #cbd5e1;">
        No applied clearance dossiers or registered enterprises found matching "<b>${escapeHtml(term)}</b>". Try searching by company name, GSTIN, or district.
      </div>`;
    return;
  }

  let html = "";

  // Render applied dossiers with clearance milestones & license actions
  if (matchedApps.length > 0) {
    html += matchedApps
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
                  ? `<a class="btn green sm" href="/pages/certificate.html?id=${a.id}" target="_blank">
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

  // Render unapplied registered enterprises clearly demarcated
  if (unappliedMatches.length > 0) {
    html += unappliedMatches
      .map(
        (ent) => `
      <div class="panel" style="margin-bottom:14px; border:1.5px solid #fed7aa; background:#fffdfa; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <h3 style="margin:0; font-size:1.15rem; color:var(--navy);">${escapeHtml(ent.company_name)}</h3>
              <span class="badge yellow" style="font-weight:700;">No Clearance Application Filed</span>
            </div>
            <div style="font-size:0.82rem; color:var(--ink-light); margin-top:4px;">
              GSTIN: <code>${escapeHtml(ent.registration_no || "N/A")}</code> · District: <b>${escapeHtml(ent.district || "Maharashtra")}</b> · Registered Contact: ${escapeHtml(ent.email)}
            </div>
            <div style="font-size:0.82rem; color:#b45309; margin-top:8px; display:flex; align-items:center; gap:6px;">
              <span>ℹ️</span>
              <span>This enterprise is registered in the state database, but has <b>not applied for any statutory clearance or license yet</b>. No clearance dossiers or licenses exist for this unit.</span>
            </div>
          </div>
          <div>
            <span class="badge gray">0 Clearance Dossiers</span>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  }

  container.innerHTML = html;
}

function renderApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody") || document.getElementById("rows");
  if (!tbody) return;

  const search = (
    document.getElementById("filterSearch")?.value || ""
  ).toLowerCase().trim();
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const riskFilter = document.getElementById("filterRisk")?.value || "all";
  const districtFilter = document.getElementById("filterDistrict")?.value || "all";

  let filtered = allApplications;

  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.registration_no || "").toLowerCase().includes(search) ||
        (a.district || "").toLowerCase().includes(search),
    );
  }

  if (statusFilter !== "all") {
    filtered = filtered.filter((a) => a.status === statusFilter);
  }

  if (riskFilter !== "all") {
    filtered = filtered.filter((a) => (a.risk_tier || a.risk_category || "Orange") === riskFilter);
  }

  if (districtFilter !== "all") {
    filtered = filtered.filter((a) => (a.district || "").toLowerCase() === districtFilter.toLowerCase());
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 30px; color: var(--ink-muted);">
          No applications match the selected criteria.
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
      const risk = a.risk_tier || a.risk_category || "Orange";
      const riskBadgeClass = risk === "Green" ? "green" : risk === "Red" ? "red" : "yellow";

      return `
      <tr>
        <td>
          <b>${escapeHtml(a.application_no)}</b>
          <div style="font-size:0.75rem; color:var(--ink-light);">${a.created_at ? new Date(a.created_at).toLocaleDateString() : "N/A"}</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--navy);">${escapeHtml(a.company_name)}</div>
          <div style="font-size:0.78rem; color:var(--ink-light)">${escapeHtml(a.district || "Maharashtra")} · ₹${a.project_cost || 5} Cr</div>
        </td>
        <td>
          <span class="badge blue">${escapeHtml(a.current_stage || "mpcb")}</span>
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
          <span class="badge ${riskBadgeClass}">${escapeHtml(risk)}</span>
          <div style="font-size:0.75rem; color:var(--ink-light); margin-top:2px;">${escapeHtml(a.industry_category || "Industrial")}</div>
        </td>
        <td>
          <span class="badge ${isApproved ? "green" : a.status === "Flagged" ? "yellow" : a.status === "Rejected" ? "red" : "blue"}">
            ${isApproved ? "Approved & Licensed" : a.status}
          </span>
        </td>
        <td>
          <div style="display:flex; flex-direction:column; gap:6px;">
            <button class="btn outline sm" onclick="inspectApexDossier(${a.id})">
              📑 Dossier &amp; PDFs
            </button>
            ${
              isApproved
                ? `<a class="btn green sm" href="/pages/certificate.html?id=${a.id}" target="_blank">
                     📜 View Certificate
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

let activeAppDossier = null;

async function inspectApexDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeAppId = id;
    activeAppDossier = data;

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
    if (document.getElementById("modalInspectHazard")) {
      document.getElementById("modalInspectHazard").textContent =
        data.hazardLevel || (data.hazardous ? "Chemical Hazard (High Risk)" : "Low Risk / General");
    }
    document.getElementById("modalInspectStage").textContent =
      data.current_stage || "mpcb";

    const vaultBtn = document.getElementById("modalInspectVaultBtn");
    if (vaultBtn) vaultBtn.href = `/pages/verification.html?id=${id}`;
    const vaultBtnFooter = document.getElementById("modalInspectVaultBtnFooter");
    if (vaultBtnFooter) vaultBtnFooter.href = `/pages/verification.html?id=${id}`;

    const allDocs = data.documents || [];
    const stages = data.stageStatuses || {};

    // 1. GENERAL STATUTORY SUPPORTING DOCUMENTS
    const supportingDocs = allDocs.filter((d) => {
      const pt = (d.plan_type || "").toLowerCase();
      const isDeptPlan = [
        "environmental_plan",
        "civil_plan",
        "factory_safety_plan",
        "fire_safety_plan",
      ].includes(pt);
      return !isDeptPlan;
    });

    const suppBadgeEl = document.getElementById("modalSupportingDocsBadge");
    if (suppBadgeEl) {
      if (supportingDocs.length > 0) {
        suppBadgeEl.innerHTML = `<span class="badge green" style="font-weight:700; font-size:0.75rem;">✓ Submitted (${supportingDocs.length} Document${supportingDocs.length > 1 ? "s" : ""})</span>`;
      } else {
        suppBadgeEl.innerHTML = `<span class="badge red" style="font-weight:700; font-size:0.75rem;">⚠️ 0 Submitted (Action Required)</span>`;
      }
    }

    const suppNoticeEl = document.getElementById("modalSupportingDocsNotice");
    if (suppNoticeEl) {
      if (supportingDocs.length > 0) {
        suppNoticeEl.innerHTML = `
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:6px; padding:8px 12px; margin-bottom:12px; font-size:0.8rem; color:#166534; display:flex; align-items:center; gap:8px;">
            <span style="font-weight:700;">✓</span>
            <div><b>Statutory Pre-requisite Satisfied:</b> Enterprise has submitted general statutory supporting documents required for Apex single-window appraisal.</div>
          </div>
        `;
      } else {
        suppNoticeEl.innerHTML = `
          <div style="background:#fef2f2; border:1.5px solid #fecaca; border-radius:6px; padding:10px 14px; margin-bottom:12px; font-size:0.82rem; color:#991b1b; display:flex; align-items:flex-start; gap:8px;">
            <span style="font-size:1.1rem; line-height:1;">⚠️</span>
            <div>
              <div style="font-weight:700;">Mandatory Statutory Requirement:</div>
              <div>General statutory supporting documents (e.g. Land Title / Allotment Deed, Detailed Project Report, Incorporation Proof) <b>must be submitted by the enterprise before Apex single-window approval can be granted</b>.</div>
            </div>
          </div>
        `;
      }
    }

    const suppListEl = document.getElementById("modalSupportingDocsList");
    if (suppListEl) {
      if (supportingDocs.length === 0) {
        suppListEl.innerHTML = `
          <div style="text-align:center; padding:16px; background:#fff7ed; border:1px dashed #fdba74; border-radius:6px; color:#c2410c; font-size:0.82rem;">
            ❌ No general statutory supporting documents have been submitted yet. Upload is pending from the enterprise portal.
          </div>
        `;
      } else {
        suppListEl.innerHTML = supportingDocs
          .map(
            (doc) => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; margin-bottom:8px; gap:12px;">
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:0.88rem; color:var(--navy); display:flex; align-items:center; gap:6px;">
                <span>📄</span>
                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(doc.document_type || "General Statutory Document")}</span>
              </div>
              <div style="font-size:0.78rem; color:var(--ink-light); margin-top:2px;">
                File: <b>${escapeHtml(doc.original_name || doc.file_name || "document.pdf")}</b> (${formatBytes(doc.size || 0)}) · Uploaded: ${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recorded"}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
              <span class="badge green" style="font-size:0.72rem;">Uploaded</span>
              <a class="btn outline sm" href="/api/documents/${doc.id}/view" target="_blank" style="white-space:nowrap; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                ↗ View Document
              </a>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }

    // 2. MANDATORY DEPARTMENTAL STATUTORY PLAN SUBMISSIONS (4 Authorities)
    const planItems = [
      {
        key: "environmental",
        title: "🌿 Environmental Management Plan & Effluent Scheme",
        deptCode: "mpcb",
        deptName: "Maharashtra Pollution Control Board",
        doc:
          data.plans?.environmental ||
          allDocs.find(
            (d) =>
              d.plan_type === "environmental_plan" ||
              d.department === "mpcb" ||
              (d.document_type || "").toLowerCase().includes("effluent"),
          ),
        info: stages.mpcb,
      },
      {
        key: "civil",
        title: "📐 Civil Master Layout & Infrastructure Plan",
        deptCode: "midc",
        deptName: "Maharashtra Industrial Development Corporation",
        doc:
          data.plans?.civil ||
          allDocs.find(
            (d) =>
              d.plan_type === "civil_plan" ||
              d.department === "midc" ||
              (d.document_type || "").toLowerCase().includes("civil") ||
              (d.document_type || "").toLowerCase().includes("site"),
          ),
        info: stages.midc,
      },
      {
        key: "factorySafety",
        title: `🛡️ Factory Safety Blueprint & Machine Layout (${data.hazardLevel || "Standard Risk"})`,
        deptCode: "dish",
        deptName: "Directorate of Industrial Safety & Health",
        doc:
          data.plans?.factorySafety ||
          allDocs.find(
            (d) =>
              d.plan_type === "factory_safety_plan" ||
              d.department === "dish" ||
              (d.document_type || "").toLowerCase().includes("safety"),
          ),
        info: stages.dish,
      },
      {
        key: "fireSafety",
        title: "🚒 Fire Hydrant & Emergency Evacuation Layout",
        deptCode: "fire",
        deptName: "Directorate of Maharashtra Fire Services",
        doc:
          data.plans?.fireSafety ||
          allDocs.find(
            (d) =>
              d.plan_type === "fire_safety_plan" ||
              d.department === "fire" ||
              (d.document_type || "").toLowerCase().includes("fire"),
          ),
        info: stages.fire,
      },
    ];

    const uploadedPlansCount = planItems.filter((p) => !!p.doc).length;
    const deptSummaryBadge = document.getElementById("modalDepartmentalSummaryBadge");
    if (deptSummaryBadge) {
      deptSummaryBadge.innerHTML = `
        <span class="badge ${uploadedPlansCount === 4 ? "green" : "yellow"}" style="font-size:0.75rem; font-weight:700;">
          ${uploadedPlansCount} of 4 Mandatory Plans Uploaded
        </span>
      `;
    }

    const plansContainer = document.getElementById("modalAllPlansList");
    if (plansContainer) {
      plansContainer.innerHTML = planItems
        .map((p) => {
          const isApp = p.info?.decision === "Approved";
          const isRej = p.info?.decision === "Rejected";
          const isQue = p.info?.decision === "Query";
          const statusBadge = isApp
            ? `<span class="badge green" style="font-weight:700; font-size:0.75rem;">✅ Approved by ${p.deptName}</span>`
            : isRej
              ? `<span class="badge red" style="font-weight:700; font-size:0.75rem;">❌ Rejected by ${p.deptName}</span>`
              : isQue
                ? `<span class="badge yellow" style="font-weight:700; font-size:0.75rem;">⚠️ Query Raised by ${p.deptName}</span>`
                : `<span class="badge yellow" style="font-weight:600; font-size:0.75rem;">⏳ Under Scrutiny (${p.deptName})</span>`;

          return `
            <div style="background:${isApp ? "#fafffa" : "#f8fafc"}; border:1px solid #e2e8f0; border-left:4px solid ${isApp ? "#16a34a" : isRej ? "#dc2626" : isQue ? "#ca8a04" : "#94a3b8"}; border-radius:6px; padding:12px 14px; margin-bottom:10px;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                <div style="flex:1; min-width:240px;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:700; font-size:0.92rem; color:var(--navy);">${p.title}</span>
                    ${statusBadge}
                  </div>
                  <div style="font-size:0.78rem; color:var(--ink-light); margin-top:4px;">
                    ${p.doc ? `Blueprint File: <b>${escapeHtml(p.doc.original_name || p.doc.file_name)}</b> (${formatBytes(p.doc.size || 0)})` : '<span style="color:#b91c1c; font-weight:600;">⚠️ Plan Blueprint PDF pending submission</span>'}
                  </div>
                </div>
                <div style="flex-shrink:0;">
                  ${
                    p.doc
                      ? `<a class="btn outline sm" href="/api/documents/${p.doc.id}/view" target="_blank" style="white-space:nowrap; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                           ↗ View Plan PDF
                         </a>`
                      : '<span class="badge gray">Not Uploaded</span>'
                  }
                </div>
              </div>
              ${
                p.info?.remarks
                  ? `
              <div style="font-size:0.8rem; color:#334155; margin-top:8px; padding-top:6px; border-top:1px dashed #e2e8f0;">
                <b>Department Findings:</b> "${escapeHtml(p.info.remarks)}"
                ${p.info.officer ? `<span style="color:#64748b; font-size:0.75rem;"> — ${escapeHtml(p.info.officer)} · ${new Date(p.info.decided_at).toLocaleString()}</span>` : ""}
              </div>`
                  : ""
              }
            </div>
          `;
        })
        .join("");
    }

    // 3. APEX QUICK ACTION FOOTER
    const mpcbOk = stages.mpcb?.decision === "Approved";
    const midcOk = stages.midc?.decision === "Approved";
    const dishOk = stages.dish?.decision === "Approved";
    const fireOk = stages.fire?.decision === "Approved";
    const allDeptsApproved = mpcbOk && midcOk && dishOk && fireOk;
    const hasSupporting = supportingDocs.length > 0;
    const isApproved = data.status === "Approved";

    const quickActionEl = document.getElementById("modalApexQuickAction");
    if (quickActionEl) {
      if (isApproved) {
        quickActionEl.innerHTML = `
          <a class="btn green sm" href="/pages/certificate.html?id=${data.id}" target="_blank" style="font-weight:700;">
            📜 View Clearance Certificate
          </a>
        `;
      } else if (allDeptsApproved && hasSupporting) {
        quickActionEl.innerHTML = `
          <button type="button" class="btn saffron sm" style="font-weight:700;" onclick="closeModals(); openFinalApprovalModal(${data.id}, '${data.application_no}', '${escapeHtml(data.company_name)}')">
            🏆 Grant Final Single-Window Clearance
          </button>
        `;
      } else if (allDeptsApproved && !hasSupporting) {
        quickActionEl.innerHTML = `
          <span class="badge red" style="font-weight:700; font-size:0.8rem; padding:6px 12px;">
            ⚠️ Clearance Blocked: General Supporting Documents Missing
          </span>
        `;
      } else {
        quickActionEl.innerHTML = `
          <span class="badge yellow" style="font-weight:600; font-size:0.8rem; padding:6px 12px;">
            ⏳ Awaiting Confirming Department Clearances
          </span>
        `;
      }
    }

    // Certificate banner for approved application
    let certBanner = document.getElementById("modalApexCertBanner");
    if (!certBanner) {
      certBanner = document.createElement("div");
      certBanner.id = "modalApexCertBanner";
      const parent = document.getElementById("apexInspectModal").querySelector(".modal-card");
      parent.insertBefore(certBanner, parent.children[1]);
    }
    if (isApproved) {
      certBanner.style.display = "block";
      certBanner.innerHTML = `
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-weight: 700; color: #166534; font-size: 0.95rem;">📜 Single-Window Clearance Certificate Issued</div>
            <div style="font-size: 0.78rem; color: #15803d; margin-top: 2px;">This application has received consolidated approval and a digitally signed clearance certificate has been generated.</div>
          </div>
          <a class="btn green sm" href="/pages/certificate.html?id=${data.id}" target="_blank" style="font-weight: 700;">
            View Official Certificate &rarr;
          </a>
        </div>
      `;
    } else {
      certBanner.style.display = "none";
    }

    modal.style.display = "flex";
  } catch (err) {
    alert("Could not load dossier: " + err.message);
  }
}

function openFinalApprovalModal(id, appNo, companyName, district = "Maharashtra") {
  activeAppId = id;
  // Pre-load dossier if not already loaded to check supporting docs
  if (!activeAppDossier || activeAppDossier.id !== id) {
    api(`/api/applications/${id}`).then((d) => {
      activeAppDossier = d;
    }).catch(() => {});
  }

  const decModal = document.getElementById("decisionModal");
  if (decModal) {
    const appEl = document.getElementById("decAppNo");
    if (appEl) appEl.textContent = appNo;
    const compEl = document.getElementById("decCompany");
    if (compEl) compEl.textContent = companyName;
    const distEl = document.getElementById("decDistrict");
    if (distEl) distEl.textContent = district || "Maharashtra";
    const remEl = document.getElementById("decisionRemarks");
    if (remEl) remEl.value = "";
    const linkEl = document.getElementById("decDossierLink");
    if (linkEl) linkEl.href = `/pages/verification.html?id=${id}`;
    if (typeof resetChecklist === "function") {
      resetChecklist("msins", 6);
    }
    decModal.style.display = "flex";
  } else {
    const finalModal = document.getElementById("finalApprovalModal");
    if (finalModal) {
      document.getElementById("finalModalAppNo").textContent = appNo;
      document.getElementById("finalModalCompany").textContent = companyName;
      document.getElementById("finalModalRemarks").value = "";
      finalModal.style.display = "flex";
    }
  }
}

async function submitFinalApexDecision(decision, explicitRemarks = null) {
  if (!activeAppId) return;

  if (decision === "Approved") {
    // 1. Enforce General Statutory Supporting Documents submission
    if (!activeAppDossier || activeAppDossier.id !== activeAppId) {
      try {
        activeAppDossier = await api(`/api/applications/${activeAppId}`);
      } catch (e) {
        console.warn("Could not reload dossier:", e);
      }
    }

    const suppDocs = (activeAppDossier?.documents || []).filter(
      (d) => !["environmental_plan", "civil_plan", "factory_safety_plan", "fire_safety_plan"].includes(d.plan_type)
    );

    if (suppDocs.length === 0) {
      alert("Statutory Requirement: General statutory supporting documents must be submitted by the enterprise before Apex approval can be granted.");
      return;
    }

    // 2. Enforce checklist completion
    const checkboxes = document.querySelectorAll(".msins-chk");
    const checked = Array.from(checkboxes).filter((cb) => cb.checked).length;
    if (checkboxes.length > 0 && checked < checkboxes.length) {
      alert(`Statutory Requirement: Please verify and tick all ${checkboxes.length} Apex statutory review checklist items before granting final clearance.`);
      return;
    }
  }

  const remarks =
    explicitRemarks !== null
      ? explicitRemarks
      : document.getElementById("finalModalRemarks")?.value.trim() ||
        document.getElementById("decisionRemarks")?.value.trim();

  try {
    const approvedId = activeAppId;
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
    closeDecisionModal();
    closeModals();
    await loadApplications();

    if (decision === "Approved") {
      window.open(`/pages/certificate.html?id=${approvedId}`, "_blank");
    }
  } catch (err) {
    alert("Action failed: " + err.message);
  }
}

function closeDecisionModal() {
  const m = document.getElementById("decisionModal");
  if (m) m.style.display = "none";
  const f = document.getElementById("finalApprovalModal");
  if (f) f.style.display = "none";
  closeModals();
}

async function submitApexFinal(decision = "Approved") {
  const remarks =
    document.getElementById("decisionRemarks")?.value.trim() ||
    document.getElementById("finalModalRemarks")?.value.trim() ||
    `Final Single-Window Statutory Clearance granted by Directorate of Industries & State Innovation Society Apex Authority.`;
  await submitFinalApexDecision(decision, remarks);
}

async function submitApexDecision(decision) {
  await submitApexFinal(decision);
}

let activeBanEnterpriseId = null;

function renderEnterprisesTable() {
  const tbody =
    document.getElementById("enterprisesTableBody") ||
    document.getElementById("enterpriseRows");
  if (!tbody) return;

  if (!allEnterprises.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:40px; color:var(--ink-light);">
          No registered enterprises found.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = allEnterprises
    .map((ent) => {
      const banned = ent.is_banned === 1 || ent.is_banned === true;
      const statusBadge = banned
        ? `<span class="badge red">🚫 Statutorily Banned</span><div style="font-size:.72rem; color:#991b1b; max-width:180px; margin-top:2px;">${escapeHtml(ent.ban_reason || "Statutory Breach")}</div>`
        : `<span class="badge green">✓ Active Enterprise</span>`;
      const actionBtn = banned
        ? `<button class="btn sm" style="background:#059669; color:#fff;" onclick="unbanEnterprise(${ent.id})">✓ Lift Ban</button>`
        : `<button class="btn sm" style="background:#dc2626; color:#fff;" onclick="openBanModal(${ent.id})">🚫 Blacklist Enterprise</button>`;

      return `
      <tr>
        <td>
          <b style="color:var(--navy);">${escapeHtml(ent.company_name)}</b>
          <div style="font-size:0.72rem; color:var(--ink-muted);">Registered: ${ent.created_at ? new Date(ent.created_at).toLocaleDateString() : "N/A"}</div>
        </td>
        <td><code>${escapeHtml(ent.registration_no || "GSTIN-PENDING")}</code></td>
        <td>
          <b>${escapeHtml(ent.contact_person || "Authorized Head")}</b>
          <div style="font-size:0.72rem; color:var(--ink-light);">${escapeHtml(ent.email)}</div>
        </td>
        <td><b>${escapeHtml(ent.district || "Maharashtra")}</b></td>
        <td><span class="badge gray">${ent.applications_count || 0} Dossiers</span></td>
        <td>${statusBadge}</td>
        <td>${actionBtn}</td>
      </tr>
    `;
    })
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
    const res = await api(`/api/admin/enterprises/${id}/unban`, { method: "POST" });
    alert(res.message || "Enterprise ban lifted.");
    await loadEnterprises();
  } catch (err) {
    alert("Unban failed: " + err.message);
  }
}

function openBanModal(id) {
  activeBanEnterpriseId = id;
  const ent = allEnterprises.find((x) => x.id === id);
  const nameEl =
    document.getElementById("banTargetName") ||
    document.getElementById("banModalCompany");
  if (nameEl) nameEl.textContent = ent?.company_name || `Enterprise #${id}`;

  const reasonEl =
    document.getElementById("banReasonInput") ||
    document.getElementById("banModalReason");
  if (reasonEl) reasonEl.value = "";

  const msgEl = document.getElementById("banModalMsg");
  if (msgEl) msgEl.textContent = "";

  const modal = document.getElementById("banModal");
  if (modal) modal.style.display = "flex";
}

function closeBanModal() {
  activeBanEnterpriseId = null;
  const modal = document.getElementById("banModal");
  if (modal) modal.style.display = "none";
}

function setBanChip(reason) {
  const reasonEl =
    document.getElementById("banReasonInput") ||
    document.getElementById("banModalReason");
  if (reasonEl) reasonEl.value = reason;
}

async function submitBanEnterprise() {
  if (!activeBanEnterpriseId) return;
  const reasonEl =
    document.getElementById("banReasonInput") ||
    document.getElementById("banModalReason");
  const reason = reasonEl ? reasonEl.value.trim() : "";
  if (!reason) {
    alert("Please provide the statutory reason for blacklisting.");
    return;
  }

  try {
    const res = await api(`/api/admin/enterprises/${activeBanEnterpriseId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    alert(res.message || "Enterprise statutorily blacklisted.");
    closeBanModal();
    await loadEnterprises();
  } catch (err) {
    alert("Blacklist enforcement failed: " + err.message);
  }
}

const submitBan = submitBanEnterprise;

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
    .querySelectorAll(".modal, .modal-overlay")
    .forEach((m) => (m.style.display = "none"));
}

function resetFilters() {
  const fSearch = document.getElementById("filterSearch");
  const fStatus = document.getElementById("filterStatus");
  const fRisk = document.getElementById("filterRisk");
  const fDistrict = document.getElementById("filterDistrict");
  if (fSearch) fSearch.value = "";
  if (fStatus) fStatus.value = "all";
  if (fRisk) fRisk.value = "all";
  if (fDistrict) fDistrict.value = "all";
  renderApplicationsTable();
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
    const onSearch = () => {
      const val = companySearch.value.trim();
      renderCompanySearchResults(allApplications, val);
    };
    companySearch.addEventListener("input", onSearch);
    companySearch.addEventListener("keyup", (e) => {
      if (e.key === "Enter") onSearch();
    });
  }

  const filterSearch = document.getElementById("filterSearch");
  if (filterSearch) {
    filterSearch.addEventListener("keyup", (e) => {
      if (e.key === "Enter") renderApplicationsTable();
    });
  }

  const filterStatus = document.getElementById("filterStatus");
  if (filterStatus) filterStatus.addEventListener("change", renderApplicationsTable);

  const filterRisk = document.getElementById("filterRisk");
  if (filterRisk) filterRisk.addEventListener("change", renderApplicationsTable);

  const filterDistrict = document.getElementById("filterDistrict");
  if (filterDistrict) filterDistrict.addEventListener("change", renderApplicationsTable);

  const calcZone = document.getElementById("calcPsiZone");
  const calcCap = document.getElementById("calcPsiCapital");
  const calcCat = document.getElementById("calcPsiCategory");
  if (calcZone) calcZone.addEventListener("change", runPsiCalc);
  if (calcCap) calcCap.addEventListener("input", runPsiCalc);
  if (calcCat) calcCat.addEventListener("change", runPsiCalc);
}

window.initMsinsPortal = initMsinsPortal;
window.loadApplications = loadApplications;
window.loadEnterprises = loadEnterprises;
window.renderEnterprisesTable = renderEnterprisesTable;
window.renderCompanySearchResults = renderCompanySearchResults;
window.inspectApexDossier = inspectApexDossier;
window.openFinalApprovalModal = openFinalApprovalModal;
window.submitFinalApexDecision = submitFinalApexDecision;
window.unbanEnterprise = unbanEnterprise;
window.openBanModal = openBanModal;
window.closeBanModal = closeBanModal;
window.setBanChip = setBanChip;
window.submitBanEnterprise = submitBanEnterprise;
window.submitBan = submitBan;
window.closeModals = closeModals;
window.closeDecisionModal = closeDecisionModal;
window.submitApexFinal = submitApexFinal;
window.submitApexDecision = submitApexDecision;
window.resetFilters = resetFilters;
window.runPsiCalc = runPsiCalc;


