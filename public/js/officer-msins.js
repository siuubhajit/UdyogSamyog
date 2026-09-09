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
window.resetFilters = resetFilters;
window.runPsiCalc = runPsiCalc;


