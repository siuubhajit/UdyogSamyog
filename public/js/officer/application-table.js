/**
 * Reusable Application Table & Mobile Card Renderer for Officer Workspace
 */

function getStageDecision(app, dept) {
  if (!app) return null;
  try {
    const data =
      typeof app.stage_statuses === "string"
        ? JSON.parse(app.stage_statuses || "{}")
        : app.stage_statuses || {};
    return data[dept]?.decision || null;
  } catch (_) {
    return null;
  }
}

function getStageRemarks(app, dept) {
  if (!app) return null;
  try {
    const data =
      typeof app.stage_statuses === "string"
        ? JSON.parse(app.stage_statuses || "{}")
        : app.stage_statuses || {};
    return data[dept]?.remarks || null;
  } catch (_) {
    return null;
  }
}

function renderOfficerApplicationTable({
  applications = [],
  deptConfig,
  containerId = "applicationsTableBody",
  mobileContainerId = "applicationsCardsBody",
  onInspect,
  onDecide,
}) {
  const tbody = document.getElementById(containerId);
  const mobileContainer = document.getElementById(mobileContainerId);

  if (!tbody && !mobileContainer) return;

  if (applications.length === 0) {
    const emptyHtml = `
      <div class="empty-state" style="text-align:center;padding:48px 20px;color:var(--color-text-secondary, var(--ink-secondary));">
        <div style="font-size:2.2rem;margin-bottom:8px;">📂</div>
        <h4 style="margin:0 0 6px;color:var(--color-text-primary, var(--ink));">No Applications Found</h4>
        <p style="margin:0;font-size:0.86rem;">No statutory applications match the current filter or search criteria.</p>
      </div>
    `;
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;">${emptyHtml}</td></tr>`;
    }
    if (mobileContainer) {
      mobileContainer.innerHTML = emptyHtml;
    }
    return;
  }

  // Generate table rows
  let rowsHtml = "";
  let cardsHtml = "";

  applications.forEach((a) => {
    const myDecision = getStageDecision(a, deptConfig.deptCode);
    const myRemarks = getStageRemarks(a, deptConfig.deptCode);
    const isApproved = myDecision === "Approved";
    const isQuery = myDecision === "Query";
    const isRejected = myDecision === "Rejected";

    let statusBadge = `<span class="badge saffron">⏳ Under Scrutiny</span>`;
    if (isApproved) {
      statusBadge = `<span class="badge green">✓ Cleared by ${deptConfig.shortName}</span>`;
    } else if (isQuery) {
      statusBadge = `<span class="badge ruby">⚠️ Query Raised</span>`;
    } else if (isRejected) {
      statusBadge = `<span class="badge red">✕ Refused</span>`;
    } else if (a.status === "Approved") {
      statusBadge = `<span class="badge emerald">★ Final State Sanction</span>`;
    }

    const land = a.land_size_sqm
      ? `${a.land_size_sqm.toLocaleString()} m²`
      : "Plot Allotted";
    const builtUp = a.built_up_area_sqm
      ? `${a.built_up_area_sqm.toLocaleString()} m²`
      : "—";
    const cost = a.project_cost_cr
      ? `₹${a.project_cost_cr} Cr`
      : "Micro / Small";
    const power = a.electricity_load_kw
      ? `${a.electricity_load_kw} kW`
      : "LT Supply";
    const water = a.water_requirement_kld
      ? `${a.water_requirement_kld} KLD`
      : "Standard";
    const category = a.industry_category || "General";
    const hazard =
      a.hazard_classification || (a.is_hazardous ? "High Hazard" : "Low Risk");

    // Dynamic parameter column based on department focus
    let paramColHtml = "";
    if (deptConfig.deptCode === "mpcb") {
      paramColHtml = `
        <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">Water: ${water}</div>
        <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">Category: ${escapeHtml(category)}</div>
      `;
    } else if (deptConfig.deptCode === "midc") {
      paramColHtml = `
        <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">Plot: ${land}</div>
        <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">Built-up: ${builtUp}</div>
      `;
    } else if (deptConfig.deptCode === "dish") {
      paramColHtml = `
        <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">Hazard: ${escapeHtml(hazard)}</div>
        <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">Power: ${power}</div>
      `;
    } else {
      // Fire
      paramColHtml = `
        <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">Plinth: ${builtUp !== "—" ? builtUp : land}</div>
        <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">Cost: ${cost}</div>
      `;
    }

    // Action button
    const actionBtn = isApproved
      ? `<span style="color:var(--color-success, var(--ok-ink));font-weight:700;font-size:0.8rem;">✓ Clear</span>`
      : `<button class="btn btn-sm btn-primary" style="font-weight:700;" onclick="window.triggerWorkspaceDecision('${a.id}')">
           Decide
         </button>`;

    // Desktop Row
    rowsHtml += `
      <tr id="appRow_${a.id}">
        <td>
          <span style="font-family:monospace;font-weight:700;font-size:0.84rem;color:var(--color-text-primary, var(--ink));">${a.application_no}</span>
          <div style="font-size:0.72rem;color:var(--color-text-secondary, var(--ink-secondary));">${new Date(a.created_at || Date.now()).toLocaleDateString("en-IN")}</div>
        </td>
        <td>
          <div class="enterprise-title" style="font-weight:700;font-size:0.88rem;color:var(--color-text-primary, var(--ink));">${escapeHtml(a.company_name)}</div>
          <div style="font-size:0.76rem;color:var(--color-text-secondary, var(--ink-secondary));">${escapeHtml(a.location || "Maharashtra")} · ${escapeHtml(a.district || "Industrial Zone")}</div>
        </td>
        <td>${paramColHtml}</td>
        <td>
          <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">${cost}</div>
          <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">${power}</div>
        </td>
        <td>
          ${statusBadge}
          ${myRemarks ? `<div style="font-size:0.72rem;color:var(--color-text-secondary, var(--ink-secondary));max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;">${escapeHtml(myRemarks)}</div>` : ""}
        </td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="btn btn-sm btn-outline" onclick="window.inspectWorkspaceDossier('${a.id}')" title="Inspect Dossier">
              Inspect
            </button>
            ${actionBtn}
          </div>
        </td>
      </tr>
    `;

    // Mobile Card View (< 768px)
    cardsHtml += `
      <div class="officer-app-card" style="background:var(--color-surface-card, var(--surface-card));border:1px solid var(--color-border, var(--line));border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <span style="font-family:monospace;font-weight:700;font-size:0.82rem;color:var(--color-text-primary, var(--ink));">${a.application_no}</span>
            <div style="font-size:0.72rem;color:var(--color-text-secondary, var(--ink-secondary));">${new Date(a.created_at || Date.now()).toLocaleDateString("en-IN")}</div>
          </div>
          <div>${statusBadge}</div>
        </div>
        <div class="enterprise-title" style="font-weight:700;font-size:0.95rem;color:var(--color-text-primary, var(--ink));margin-bottom:4px;">
          ${escapeHtml(a.company_name)}
        </div>
        <div style="font-size:0.78rem;color:var(--color-text-secondary, var(--ink-secondary));margin-bottom:10px;">
          📍 ${escapeHtml(a.location || "Maharashtra")}, ${escapeHtml(a.district || "Industrial Cluster")}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.8rem;background:var(--surface-card-alt, rgba(0,0,0,0.02));padding:8px 10px;border-radius:8px;margin-bottom:12px;">
          <div>${paramColHtml}</div>
          <div>
            <div style="font-weight:600;color:var(--color-text-primary, var(--ink));">Cost: ${cost}</div>
            <div style="font-size:0.75rem;color:var(--color-text-secondary, var(--ink-secondary));">${power}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-sm btn-outline" style="flex:1;" onclick="window.inspectWorkspaceDossier('${a.id}')">
            Inspect Dossier
          </button>
          <div style="flex:1;">${actionBtn}</div>
        </div>
      </div>
    `;
  });

  if (tbody) tbody.innerHTML = rowsHtml;
  if (mobileContainer) mobileContainer.innerHTML = cardsHtml;
}

if (typeof window !== "undefined") {
  window.renderOfficerApplicationTable = renderOfficerApplicationTable;
  window.getStageDecision = getStageDecision;
}
