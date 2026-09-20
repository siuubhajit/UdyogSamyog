/**
 * Udyog Samyog — Module A: Pre-Application Advisor & What-if Simulator UI
 */
(function () {
  "use strict";

  function createAdvisorUI() {
    if (document.getElementById("ai-advisor-modal")) return;

    const style = document.createElement("style");
    style.textContent = `
      .advisor-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 18, 35, 0.78);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 9998;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
      }
      .advisor-modal-overlay.open { display: flex; }
      .advisor-modal {
        background: var(--surface-card, #ffffff);
        color: var(--ink, #0f172a);
        border: 1px solid var(--line-strong, #cbd5e1);
        border-radius: 16px;
        width: 920px;
        max-width: 96vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        animation: advPop 0.22s ease-out;
      }
      @keyframes advPop {
        from { transform: scale(0.96); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .advisor-header {
        background: linear-gradient(135deg, #0b2545 0%, #134074 100%);
        color: #ffffff;
        padding: 16px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      .advisor-header h3 { margin: 0; font-size: 1.2rem; font-weight: 700; color:#fff; }
      .advisor-header p { margin: 4px 0 0 0; font-size: 0.8rem; opacity: 0.9; color:rgba(255,255,255,0.9); }
      .advisor-body {
        padding: 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
        flex: 1 1 auto;
      }
      .advisor-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
        background: var(--surface-subtle, #f8fafc);
        padding: 16px;
        border-radius: 12px;
        border: 1px solid var(--line, #e2e8f0);
      }
      .adv-field label {
        display: block;
        font-size: 0.78rem;
        font-weight: 700;
        color: var(--ink-secondary, #334155);
        margin-bottom: 4px;
      }
      .adv-field input, .adv-field select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid var(--line, #cbd5e1);
        border-radius: 6px;
        font-size: 0.88rem;
        background: var(--surface-card, #ffffff);
        color: var(--ink, #0f172a);
      }
      .advisor-badges {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .adv-badge {
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.82rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .adv-badge.msme { background: #e0f2fe; color: #0369a1; }
      .adv-badge.risk-red { background: #fee2e2; color: #b91c1c; }
      .adv-badge.risk-orange { background: #ffedd5; color: #c2410c; }
      .adv-badge.risk-green { background: #dcfce7; color: #15803d; }
      .adv-section-title {
        font-size: 1rem;
        font-weight: 700;
        color: var(--ink, #0f172a);
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .adv-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.84rem;
      }
      .adv-table th {
        background: var(--surface-card-alt, #f1f5f9);
        text-align: left;
        padding: 8px 12px;
        color: var(--ink-secondary, #475569);
        font-weight: 700;
        border-bottom: 2px solid var(--line, #cbd5e1);
      }
      .adv-table td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--line, #e2e8f0);
        vertical-align: top;
        color: var(--ink, #0f172a);
      }
      .adv-whatif-card {
        background: rgba(22, 163, 74, 0.08);
        border: 1px solid rgba(22, 163, 74, 0.3);
        padding: 14px 18px;
        border-radius: 10px;
        color: var(--ink, #0f172a);
      }
      .adv-diff-tag {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        margin-right: 6px;
      }
      .adv-diff-tag.added { background: #dcfce7; color: #166534; }
      .adv-diff-tag.removed { background: #fee2e2; color: #991b1b; }
      .advisor-footer {
        padding: 14px 22px;
        background: var(--surface-card, #f8fafc);
        border-top: 1px solid var(--line, #e2e8f0);
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      @media (max-width: 768px) {
        .advisor-modal-overlay {
          padding: 0 !important;
          align-items: flex-end !important;
        }
        .advisor-modal {
          width: 100% !important;
          max-width: 100% !important;
          max-height: 92vh !important;
          border-radius: 20px 20px 0 0 !important;
          animation: sheetSlideUp 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .advisor-header { padding: 14px 16px; }
        .advisor-body { padding: 14px 14px 20px 14px; }
        .advisor-footer {
          flex-direction: column-reverse;
          gap: 10px;
          padding: 12px 16px 20px 16px;
        }
        .advisor-footer button, .advisor-footer a {
          width: 100%;
          justify-content: center;
          min-height: 44px;
        }
      }
    `;
    document.head.appendChild(style);

    const modal = document.createElement("div");
    modal.id = "ai-advisor-modal";
    modal.className = "advisor-modal-overlay";
    modal.innerHTML = `
      <div class="advisor-modal">
        <div class="advisor-header">
          <div>
            <h3>💡 AI Pre-Application Statutory Advisor</h3>
            <p>Predict mandatory departmental clearances, MSME categorization, and incentive subsidies</p>
          </div>
          <button class="btn sm outline" style="color:#fff;border-color:rgba(255,255,255,0.4)" id="advCloseBtn">✕</button>
        </div>

        <div class="advisor-body">
          <div class="advisor-grid">
            <div class="adv-field">
              <label>Industrial Sector</label>
              <select id="advSector">
                <option value="Chemicals">Chemicals & Petrochemicals</option>
                <option value="Pharmaceuticals">Pharmaceuticals & API</option>
                <option value="Automobile">Automobile & Auto Ancillary</option>
                <option value="Textile">Textiles & Garments</option>
                <option value="Food Processing">Food Processing & Agro</option>
                <option value="IT & Electronics">IT, Software & Electronics</option>
                <option value="Light Engineering">Light Engineering & Fabrication</option>
              </select>
            </div>
            <div class="adv-field">
              <label>Capital Investment (₹ Crores)</label>
              <input type="number" id="advCost" value="12.5" step="0.5" min="0.1" />
            </div>
            <div class="adv-field">
              <label>Plot Size (Acres)</label>
              <input type="number" id="advLand" value="3.0" step="0.5" min="0.1" />
            </div>
            <div class="adv-field">
              <label>Daily Water Demand (KLD)</label>
              <input type="number" id="advWater" value="25.0" step="5" min="0" />
            </div>
            <div class="adv-field">
              <label>District in Maharashtra</label>
              <select id="advDistrict">
                <option value="Pune">Pune</option>
                <option value="Thane">Thane</option>
                <option value="Raigad">Raigad</option>
                <option value="Nashik">Nashik</option>
                <option value="Chhatrapati Sambhajinagar">Chhatrapati Sambhajinagar</option>
                <option value="Nagpur">Nagpur</option>
                <option value="Solapur">Solapur</option>
                <option value="Gadchiroli">Gadchiroli (Zone D+)</option>
              </select>
            </div>
            <div class="adv-field" style="display:flex;align-items:center;padding-top:20px;">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input type="checkbox" id="advHazardous" style="width:auto;" />
                <span>Hazardous / Effluent Generating</span>
              </label>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;">
            <button class="btn primary sm" id="advCalculateBtn">⚡ Run Statutory Rule Engine</button>
          </div>

          <div id="advResultsContainer" style="display:none;display:flex;flex-direction:column;gap:18px;">
            <div class="advisor-badges">
              <div class="adv-badge msme" id="advMsmeBadge">MSME: Small Enterprise</div>
              <div class="adv-badge risk-orange" id="advRiskBadge">Risk Tier: Orange</div>
              <div class="adv-badge" style="background:#f1f5f9;color:#334155;" id="advClearanceCountBadge">Clearances: 4</div>
            </div>

            <div id="advSummaryAlert" style="background:#f8fafc;border-left:4px solid #134074;padding:10px 14px;border-radius:4px;font-size:0.86rem;line-height:1.4;"></div>

            <!-- What-if Comparison -->
            <div class="adv-whatif-card" id="advWhatIfBox">
              <div style="font-weight:700;font-size:0.9rem;color:#166534;margin-bottom:6px;">🔄 What-If Simulation Delta:</div>
              <div id="advWhatIfText" style="font-size:0.84rem;color:#1e293b;">Modify any parameter above to observe real-time regulatory impact.</div>
            </div>

            <!-- Clearances Table -->
            <div>
              <div class="adv-section-title">📋 Mandatory Clearances by Operational Phase</div>
              <table class="adv-table">
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Clearance Required</th>
                    <th>Competent Authority</th>
                    <th>Statutory Act / Citation</th>
                  </tr>
                </thead>
                <tbody id="advClearanceTableBody"></tbody>
              </table>
            </div>

            <!-- Incentive Schemes -->
            <div>
              <div class="adv-section-title">💰 Entitled Fiscal Incentive Policies</div>
              <div id="advSchemesList" style="display:flex;flex-direction:column;gap:8px;"></div>
            </div>
          </div>
        </div>

        <div class="advisor-footer">
          <span style="font-size:0.75rem;color:#64748b;">Statutory Rule Engine v2026.09.1 · Grounded in official Maharashtra GRs</span>
          <div>
            <button class="btn outline sm" id="advCloseBtn2">Close</button>
            <button class="btn primary sm" id="advApplyToFormBtn" style="display:none;">📝 Apply to Application Form</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Bindings
    document.getElementById("advCloseBtn").onclick = () => modal.classList.remove("open");
    document.getElementById("advCloseBtn2").onclick = () => modal.classList.remove("open");
    document.getElementById("advCalculateBtn").onclick = calculateAdvice;

    document.getElementById("advApplyToFormBtn").onclick = () => {
      // If on application.html, prefill
      const cat = document.getElementById("advSector").value;
      const cost = document.getElementById("advCost").value;
      const land = document.getElementById("advLand").value;
      const water = document.getElementById("advWater").value;
      const dist = document.getElementById("advDistrict").value;
      const haz = document.getElementById("advHazardous").checked;

      const fCat = document.getElementById("industryCategory");
      const fCost = document.getElementById("projectCost");
      const fLand = document.getElementById("landSize");
      const fWater = document.getElementById("waterUse");
      const fDist = document.getElementById("district");
      const fHaz = document.getElementById("hazardous");

      if (fCat) fCat.value = cat;
      if (fCost) fCost.value = cost;
      if (fLand) fLand.value = land;
      if (fWater) fWater.value = water;
      if (fDist) fDist.value = dist;
      if (fHaz) fHaz.checked = haz;

      modal.classList.remove("open");
      if (typeof window.runKnowledgeEngine === "function") {
        window.runKnowledgeEngine();
      }
    };
  }

  async function calculateAdvice() {
    const payload = {
      industry_category: document.getElementById("advSector").value,
      project_cost: parseFloat(document.getElementById("advCost").value) || 1.0,
      land_size: parseFloat(document.getElementById("advLand").value) || 1.0,
      water_use: parseFloat(document.getElementById("advWater").value) || 10.0,
      district: document.getElementById("advDistrict").value,
      hazardous: document.getElementById("advHazardous").checked,
    };

    try {
      const resp = await fetch("/api/ai/advisor/advise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();

      document.getElementById("advResultsContainer").style.display = "flex";
      document.getElementById("advApplyToFormBtn").style.display = "inline-block";

      // Badges
      const msmeBadge = document.getElementById("advMsmeBadge");
      msmeBadge.textContent = `MSME: ${data.msme_category} Enterprise`;

      const riskBadge = document.getElementById("advRiskBadge");
      riskBadge.textContent = `Risk Tier: ${data.risk_tier} Category`;
      riskBadge.className = `adv-badge risk-${data.risk_tier.toLowerCase()}`;

      document.getElementById("advClearanceCountBadge").textContent = `Clearances: ${data.applicable_clearances.length} Mandatory`;
      document.getElementById("advSummaryAlert").textContent = data.explanation;

      // Table
      const tb = document.getElementById("advClearanceTableBody");
      tb.innerHTML = "";
      data.applicable_clearances.forEach((c) => {
        const tr = document.createElement("tr");
        const src = (c.sources && c.sources[0]) || {};
        tr.innerHTML = `
          <td><span style="font-weight:700;color:#134074;">Phase ${c.phase}</span></td>
          <td><strong>${c.name}</strong><br><span style="font-size:0.75rem;color:#64748b;">${c.why}</span></td>
          <td>${c.department}</td>
          <td><code>${c.statutory_act}</code><br><span style="font-size:0.72rem;color:#0369a1;">${src.section || ''}</span></td>
        `;
        tb.appendChild(tr);
      });

      // Schemes
      const scList = document.getElementById("advSchemesList");
      scList.innerHTML = "";
      data.applicable_schemes.forEach((s) => {
        const div = document.createElement("div");
        div.style.cssText = "background:#f8fafc;padding:10px 14px;border-radius:8px;border:1px solid #e2e8f0;font-size:0.84rem;";
        div.innerHTML = `
          <div style="font-weight:700;color:#0b2545;">✨ ${s.title}</div>
          <div style="font-size:0.78rem;color:#475569;margin-top:2px;">${s.benefits}</div>
        `;
        scList.appendChild(div);
      });

    } catch (err) {
      (window.notify || alert)("Failed to evaluate statutory rules: " + err.message, "error");
    }
  }

  window.openAdvisorModal = function () {
    createAdvisorUI();
    document.getElementById("ai-advisor-modal").classList.add("open");
    calculateAdvice();
  };

  // Mount an "AI Advisor" trigger button if an applicant header is present
  function attachAdvisorLauncher() {
    const headerActions = document.querySelector(".topbar-actions");
    if (headerActions && !document.getElementById("btnLaunchAdvisor")) {
      const btn = document.createElement("button");
      btn.id = "btnLaunchAdvisor";
      btn.className = "btn outline sm";
      btn.style.cssText = "border-color:#134074;color:#134074;font-weight:700;";
      btn.innerHTML = "💡 AI Advisor";
      btn.onclick = window.openAdvisorModal;
      headerActions.prepend(btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachAdvisorLauncher);
  } else {
    attachAdvisorLauncher();
  }
})();

