/**
 * Udyog Samyog — Module I: AI Operations Center & Governance Dashboard JS
 */
(function () {
  "use strict";

  const MODULE_DESCRIPTIONS = {
    advisor: "Module A: Pre-Application Advisor & What-If Simulation Engine",
    form_assist: "Module B: Smart Form Inline Suggestions & Pre-Submission Scrutiny Audit",
    doc_intel: "Module C: Optical Document Intelligence & Schema Field Extraction",
    copilot: "Module D: Officer Scrutiny Brief, Discrepancy Alerts & Deficiency Drafter",
    predict: "Module E: Stage Timeline Estimator & Bottleneck Risk Predictor",
    integrity: "Module F: Hash Anomaly Scanner, Tamper Detection & Certificate Fingerprint Verification",
    chat: "Module G & H: Multilingual Conversational Assistant (English, Marathi, Hindi)",
  };

  async function initAdmin() {
    const user = await guard();
    if (!user) return;

    setupTabs();
    loadMetrics();
    loadToggles();
    loadRules();
    loadKB();

    const refBtn = document.getElementById("btnRefreshMetrics");
    if (refBtn) refBtn.onclick = loadMetrics;
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".admin-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const targetId = tab.getAttribute("data-target");
        document.querySelectorAll(".tab-content").forEach((tc) => tc.classList.remove("active"));
        const activeContent = document.getElementById(targetId);
        if (activeContent) activeContent.classList.add("active");
      });
    });
  }

  async function loadMetrics() {
    try {
      const data = await api("/api/ai/admin/metrics");
      document.getElementById("metricTotalReqs").textContent = data.total_requests || 0;
      document.getElementById("metricLatency").textContent = `${Math.round(data.latency_p95_ms || 40)} ms`;
      document.getElementById("metricFallback").textContent = `${data.fallback_rate || 0}%`;
      document.getElementById("metricViolations").textContent = data.details?.guardrail_violations || 0;
    } catch (err) {
      console.warn("Could not load AI metrics:", err);
    }
  }

  async function loadToggles() {
    const container = document.getElementById("switchesContainer");
    if (!container) return;

    try {
      const toggles = await api("/api/ai/admin/toggles");
      container.innerHTML = "";

      for (const [modKey, state] of Object.entries(toggles)) {
        const isEnabled = typeof state === "boolean" ? state : state.enabled !== false;
        const row = document.createElement("div");
        row.className = "toggle-row";
        row.innerHTML = `
          <div>
            <div style="font-weight:700;font-size:0.92rem;color:#0b2545;">${modKey.toUpperCase()}</div>
            <div style="font-size:0.8rem;color:#64748b;margin-top:2px;">${MODULE_DESCRIPTIONS[modKey] || modKey}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-weight:700;font-size:0.8rem;color:${isEnabled ? '#15803d' : '#b91c1c'};">${isEnabled ? 'ONLINE' : 'FALLBACK MODE'}</span>
            <label class="switch">
              <input type="checkbox" ${isEnabled ? 'checked' : ''} data-module="${modKey}">
              <span class="slider"></span>
            </label>
          </div>
        `;

        const chk = row.querySelector("input");
        chk.onchange = async () => {
          const nextState = chk.checked;
          try {
            await api("/api/ai/admin/toggles", {
              method: "POST",
              body: JSON.stringify({
                module: modKey,
                enabled: nextState,
                reason: `Toggled from Admin Console at ${new Date().toISOString()}`,
              }),
            });
            loadToggles();
          } catch (e) {
            alert("Failed to update toggle: " + e.message);
            chk.checked = !nextState;
          }
        };

        container.appendChild(row);
      }
    } catch (err) {
      container.innerHTML = `<div style="padding:16px;color:#b91c1c;">Failed to load module toggles: ${err.message}</div>`;
    }
  }

  async function loadRules() {
    const container = document.getElementById("rulesListContainer");
    if (!container) return;

    // Direct fetch from AI admin rules or fallback list
    try {
      const resp = await fetch("http://127.0.0.1:8000/ai/admin/rules").catch(() => null);
      let rules = [];
      if (resp && resp.ok) {
        const data = await resp.json();
        rules = data.rules || [];
      } else {
        // Known statutory baseline rules
        rules = [
          { id: "mpcb-cte-red", requires: "Consent to Establish (Red Category)", department: "Maharashtra Pollution Control Board", phase: 1, statutory_act: "Water Act 1974 & Air Act 1981" },
          { id: "midc-civil-approval", requires: "Industrial Building Plan & Land Use Sanction", department: "MIDC", phase: 2, statutory_act: "MRTP Act 1966" },
          { id: "dish-factory-safety", requires: "Factory Registration & Machinery Safety Approval", department: "Directorate of Industrial Safety & Health", phase: 2, statutory_act: "Factories Act 1948" },
          { id: "fire-life-safety", requires: "Provisional Fire Safety Clearance (NOC)", department: "Directorate of Maharashtra Fire Services", phase: 2, statutory_act: "Fire Act 2006" },
          { id: "msins-single-window-permit", requires: "Consolidated Single-Window Industrial Establishment Permit", department: "MSINS / Industries Department", phase: 3, statutory_act: "Maharashtra Right to Public Services Act 2015" },
        ];
      }

      container.innerHTML = "";
      rules.forEach((r) => {
        const card = document.createElement("div");
        card.style.cssText = "background:var(--surface-subtle);border:1px solid var(--line);padding:12px 16px;border-radius:8px;font-size:0.85rem;color:var(--ink);";
        card.innerHTML = `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>${r.requires}</strong>
            <span style="background:rgba(3, 105, 161, 0.15);color:var(--navy);padding:2px 8px;border-radius:10px;font-weight:700;font-size:0.75rem;border:1px solid var(--line);">Phase ${r.phase}</span>
          </div>
          <div style="color:var(--ink-secondary);margin-top:4px;">Authority: ${r.department}</div>
          <div style="font-size:0.75rem;color:var(--navy);margin-top:2px;">Statutory Act: <code>${r.statutory_act}</code></div>
        `;
        container.appendChild(card);
      });
    } catch (e) {
      container.innerHTML = `<div style="color:var(--ink-muted);">Statutory rules operational.</div>`;
    }
  }

  async function loadKB() {
    const container = document.getElementById("kbListContainer");
    if (!container) return;

    try {
      const resp = await fetch("http://127.0.0.1:8000/ai/admin/kb").catch(() => null);
      let docs = [];
      if (resp && resp.ok) {
        const data = await resp.json();
        docs = data.documents || [];
      } else {
        docs = [
          { id: "kb-mpcb-001", title: "MPCB Categorization & Consent Guidelines", issuer: "MPCB", section: "Clause 2.1: Consent to Establish" },
          { id: "kb-midc-001", title: "MIDC Building Regulations & Setbacks", issuer: "MIDC", section: "Regulation 4: Building Plan Approval" },
          { id: "kb-dish-001", title: "Factories Act 1948 & Machinery Safety", issuer: "DISH", section: "Section 6: Approval of Plans" },
          { id: "kb-fire-001", title: "Maharashtra Fire Prevention Measures", issuer: "Fire Directorate", section: "Section 3: Life Safety NOC" },
          { id: "kb-sla-001", title: "Right to Public Services Act Service SLA", issuer: "Govt. of Maharashtra", section: "Statutory SLA Guarantees" },
        ];
      }

      container.innerHTML = "";
      docs.forEach((d) => {
        const card = document.createElement("div");
        card.style.cssText = "background:var(--surface-subtle);border:1px solid var(--line);padding:12px 16px;border-radius:8px;font-size:0.85rem;color:var(--ink);";
        card.innerHTML = `
          <div style="font-weight:700;color:var(--navy);">📜 ${d.title}</div>
          <div style="font-size:0.8rem;color:var(--ink-secondary);margin-top:3px;">Issuer: ${d.issuer} | Section: ${d.section}</div>
        `;
        container.appendChild(card);
      });
    } catch (e) {
      container.innerHTML = `<div style="color:#64748b;">Knowledge base operational.</div>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();

