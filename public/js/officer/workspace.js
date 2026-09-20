/**
 * Master Officer Workspace Controller
 * Consolidates MPCB, MIDC, DISH, and FIRE into one unified, stateful dashboard
 */

let currentDeptCode = "midc";
let currentDeptConfig = null;
let allWorkspaceApplications = [];
let activeFilter = "all";
let activeDossierApp = null;
let activeDossierAppId = null;

async function initOfficerWorkspace() {
  const user = await guard("official");
  if (!user) return;

  // Determine active department
  const params = new URLSearchParams(window.location.search);
  const deptParam = (params.get("dept") || "").toLowerCase();
  const userDept = (user.deptCode || "").toLowerCase();

  if (deptParam && window.DEPARTMENT_CONFIG && window.DEPARTMENT_CONFIG[deptParam]) {
    currentDeptCode = deptParam;
  } else if (userDept && window.DEPARTMENT_CONFIG && window.DEPARTMENT_CONFIG[userDept]) {
    currentDeptCode = userDept;
  } else {
    currentDeptCode = "midc";
  }

  currentDeptConfig = window.DEPARTMENT_CONFIG[currentDeptCode] || window.DEPARTMENT_CONFIG.midc;

  // Render department header context & accent stripe
  renderDepartmentHeader();

  // Render filter chips
  renderFilterControls();

  // Mount department calculator
  mountDepartmentCalculator();

  // Wire search input
  setupWorkspaceEventListeners();

  // Load applications
  await reloadWorkspaceApplications();
}

function renderDepartmentHeader() {
  const cfg = currentDeptConfig;
  if (!cfg) return;

  // Accent stripe
  const stripe = document.getElementById("deptStripe");
  if (stripe) {
    stripe.style.background = cfg.accentColor;
  }

  // Page title and subtitle
  const titleEl = document.getElementById("workspaceTitle");
  if (titleEl) titleEl.textContent = cfg.title;

  const pretitleEl = document.getElementById("workspacePretitle");
  if (pretitleEl) pretitleEl.textContent = `Government of Maharashtra · ${cfg.name}`;

  const subtitleEl = document.getElementById("workspaceSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `Statutory scrutiny console for ${cfg.name}. Review technical dossiers, perform statutory calculations, and record decisions.`;
  }

  // Phase badge
  const phaseBadgeEl = document.getElementById("workspacePhaseBadge");
  if (phaseBadgeEl) {
    phaseBadgeEl.className = `badge ${cfg.badgeClass || 'navy'}`;
    phaseBadgeEl.textContent = cfg.phase;
  }

  // Header explanation text
  const infoTextEl = document.getElementById("workspaceStageInfoText");
  if (infoTextEl) {
    infoTextEl.innerHTML = `Applications in <b>${cfg.phase}</b>. Review the applicant's <b>${cfg.planLabel}</b> and statutory supporting records. Ensure all checklist points are verified before issuing approval.`;
  }
}

function renderFilterControls() {
  const cfg = currentDeptConfig;
  const container = document.getElementById("filterChipsContainer");
  if (!container || !cfg || !cfg.filterOptions) return;

  container.innerHTML = `
    <span style="font-size:0.75rem;font-weight:700;color:var(--color-text-secondary, #64748b);align-self:center;">
      ${cfg.filterTitle}:
    </span>
    ${cfg.filterOptions.map((opt) => `
      <button type="button" class="cluster-chip ${opt.id === activeFilter ? 'active' : ''}" data-filter="${opt.id}" onclick="filterWorkspace('${opt.id}')">
        ${opt.label}
      </button>
    `).join("")}
  `;
}

function filterWorkspace(filterId) {
  activeFilter = filterId;
  document.querySelectorAll("#filterChipsContainer .cluster-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filterId);
  });
  applyWorkspaceFilters();
}

function mountDepartmentCalculator() {
  const cfg = currentDeptConfig;
  const drawerContainer = document.getElementById("calculatorDrawerContent");
  if (!drawerContainer || !cfg) return;

  if (cfg.calculator === "effluent" && typeof window.renderMpcbCalculator === "function") {
    window.renderMpcbCalculator(drawerContainer);
  } else if (cfg.calculator === "fsi" && typeof window.renderMidcCalculator === "function") {
    window.renderMidcCalculator(drawerContainer);
  } else if (cfg.calculator === "workers" && typeof window.renderDishCalculator === "function") {
    window.renderDishCalculator(drawerContainer);
  } else if (cfg.calculator === "fireWater" && typeof window.renderFireCalculator === "function") {
    window.renderFireCalculator(drawerContainer);
  }
}

function toggleCalculatorDrawer() {
  const drawer = document.getElementById("calculatorDrawerSection");
  if (!drawer) return;
  const isHidden = drawer.style.display === "none" || !drawer.style.display;
  drawer.style.display = isHidden ? "block" : "none";
  const btn = document.getElementById("toggleCalculatorBtn");
  if (btn) {
    btn.textContent = isHidden ? "✕ Hide Calculator Tool" : "📐 Open Calculation Tool";
  }
}

async function reloadWorkspaceApplications() {
  try {
    const apps = await api("/api/applications");
    allWorkspaceApplications = apps || [];
    renderWorkspaceKPIs();
    applyWorkspaceFilters();
  } catch (err) {
    console.error("Failed to load workspace applications:", err);
    if (typeof notify === "function") {
      notify("Failed to fetch applications: " + err.message, "error");
    }
  }
}

function renderWorkspaceKPIs() {
  const dept = currentDeptConfig.deptCode;
  const isPhase1 = dept === "mpcb";

  // Relevant applications for this department
  const relevant = allWorkspaceApplications.filter((a) => {
    if (isPhase1) {
      return a.current_stage === "mpcb" || !!getStageDecision(a, "mpcb");
    }
    return (
      a.current_stage === "parallel_scrutiny" ||
      a.current_stage === dept ||
      !!getStageDecision(a, dept) ||
      a.status === "Approved"
    );
  });

  const pending = relevant.filter((a) => getStageDecision(a, dept) !== "Approved").length;
  const approved = relevant.filter((a) => getStageDecision(a, dept) === "Approved").length;

  const elPending = document.getElementById("kpiPendingCount");
  if (elPending) elPending.textContent = pending;

  const elApproved = document.getElementById("kpiApprovedCount");
  if (elApproved) elApproved.textContent = approved;

  const elTotal = document.getElementById("kpiTotalCount");
  if (elTotal) elTotal.textContent = relevant.length;
}

function applyWorkspaceFilters() {
  const cfg = currentDeptConfig;
  const dept = cfg.deptCode;
  const isPhase1 = dept === "mpcb";

  const search = (document.getElementById("workspaceSearchInput")?.value || "").toLowerCase().trim();

  let filtered = allWorkspaceApplications.filter((a) => {
    if (isPhase1) {
      return a.current_stage === "mpcb" || !!getStageDecision(a, "mpcb") || a.status === "Approved";
    }
    return (
      a.current_stage === "parallel_scrutiny" ||
      a.current_stage === dept ||
      !!getStageDecision(a, dept) ||
      a.status === "Approved"
    );
  });

  // Filter chips
  if (activeFilter !== "all") {
    if (cfg.filterType === "zone") {
      filtered = filtered.filter(
        (a) =>
          (a.location || "").toLowerCase().includes(activeFilter.toLowerCase()) ||
          (a.district || "").toLowerCase().includes(activeFilter.toLowerCase())
      );
    } else if (cfg.filterType === "category") {
      filtered = filtered.filter((a) => (a.industry_category || "").toLowerCase() === activeFilter.toLowerCase());
    } else if (cfg.filterType === "hazard") {
      filtered = filtered.filter((a) => (a.hazard_classification || "").toLowerCase().includes(activeFilter.toLowerCase()));
    } else if (cfg.filterType === "fire_risk") {
      filtered = filtered.filter((a) => {
        const hazard = (a.hazard_classification || "").toLowerCase();
        if (activeFilter === "high") return hazard.includes("chemical") || hazard.includes("high");
        if (activeFilter === "medium") return hazard.includes("mechanical") || hazard.includes("medium");
        return !hazard.includes("chemical") && !hazard.includes("high");
      });
    }
  }

  // Text search
  if (search) {
    filtered = filtered.filter(
      (a) =>
        (a.company_name || "").toLowerCase().includes(search) ||
        (a.application_no || "").toLowerCase().includes(search) ||
        (a.location || "").toLowerCase().includes(search) ||
        (a.district || "").toLowerCase().includes(search)
    );
  }

  if (typeof renderOfficerApplicationTable === "function") {
    renderOfficerApplicationTable({
      applications: filtered,
      deptConfig: cfg,
      containerId: "applicationsTableBody",
      mobileContainerId: "applicationsCardsBody"
    });
  }
}

// Dossier Inspection
async function inspectWorkspaceDossier(id) {
  try {
    const data = await api(`/api/applications/${id}`);
    activeDossierApp = data;
    activeDossierAppId = id;

    const modal = document.getElementById("dossierInspectModal");
    if (!modal) return;

    document.getElementById("inspectModalTitle").textContent = `Dossier: ${data.application_no}`;
    document.getElementById("inspectModalCompany").textContent = data.company_name;

    const metaBox = document.getElementById("inspectModalMeta");
    if (metaBox) {
      metaBox.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;font-size:0.82rem;">
          <div><span style="color:var(--color-text-secondary, #64748b);">District:</span> <b>${data.district || data.location}</b></div>
          <div><span style="color:var(--color-text-secondary, #64748b);">Land Size:</span> <b>${data.land_size_sqm ? data.land_size_sqm.toLocaleString() + ' m²' : '—'}</b></div>
          <div><span style="color:var(--color-text-secondary, #64748b);">Built-Up:</span> <b>${data.built_up_area_sqm ? data.built_up_area_sqm.toLocaleString() + ' m²' : '—'}</b></div>
          <div><span style="color:var(--color-text-secondary, #64748b);">Water Demand:</span> <b>${data.water_requirement_kld ? data.water_requirement_kld + ' KLD' : '—'}</b></div>
          <div><span style="color:var(--color-text-secondary, #64748b);">Power Demand:</span> <b>${data.electricity_load_kw ? data.electricity_load_kw + ' kW' : '—'}</b></div>
          <div><span style="color:var(--color-text-secondary, #64748b);">Project Cost:</span> <b>₹${data.project_cost_cr || '0'} Cr</b></div>
        </div>
      `;
    }

    // Documents list
    const docContainer = document.getElementById("inspectModalDocuments");
    if (docContainer) {
      const docs = data.documents || [];
      if (docs.length === 0) {
        docContainer.innerHTML = '<div style="color:var(--color-text-secondary, #64748b);font-size:0.85rem;">No digital documents attached to this dossier.</div>';
      } else {
        docContainer.innerHTML = docs.map((d) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--color-surface-page, #f8fafc);border:1px solid var(--color-border, #e2e8f0);border-radius:8px;margin-bottom:8px;">
            <div>
              <div style="font-weight:700;font-size:0.86rem;color:var(--color-text-primary, #0f172a);">${escapeHtml(d.original_name || d.name || d.file_name)}</div>
              <div style="font-size:0.74rem;color:var(--color-text-secondary, #64748b);">${d.plan_type ? 'Type: ' + d.plan_type : 'Statutory Record'} · Uploaded: ${new Date(d.uploaded_at || Date.now()).toLocaleDateString("en-IN")}</div>
            </div>
            <a href="/api/documents/${d.id}/download" target="_blank" class="btn btn-sm btn-outline" style="font-size:0.75rem;">
              View / Download
            </a>
          </div>
        `).join("");
      }
    }

    if (window.Modal) {
      Modal.open("dossierInspectModal");
    } else {
      modal.style.display = "flex";
    }
  } catch (err) {
    if (typeof notify === "function") {
      notify("Failed to load dossier: " + err.message, "error");
    } else {
      alert("Failed to load dossier: " + err.message);
    }
  }
}

// Trigger decision modal from table
function triggerWorkspaceDecision(id) {
  const app = allWorkspaceApplications.find((a) => a.id === id);
  if (!app) return;

  if (typeof window.openDepartmentDecisionModal === "function") {
    window.openDepartmentDecisionModal({
      applicationId: app.id,
      department: currentDeptConfig.deptCode,
      applicationNo: app.application_no,
      companyName: app.company_name,
      deptConfig: currentDeptConfig
    });
  }
}

function setupWorkspaceEventListeners() {
  const searchInput = document.getElementById("workspaceSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => applyWorkspaceFilters());
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") applyWorkspaceFilters();
    });
  }
}

if (typeof window !== "undefined") {
  window.initOfficerWorkspace = initOfficerWorkspace;
  window.filterWorkspace = filterWorkspace;
  window.toggleCalculatorDrawer = toggleCalculatorDrawer;
  window.reloadWorkspaceApplications = reloadWorkspaceApplications;
  window.inspectWorkspaceDossier = inspectWorkspaceDossier;
  window.triggerWorkspaceDecision = triggerWorkspaceDecision;
}

