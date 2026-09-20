/**
 * Udyog Samyog — Module B: Smart Form Assistance & Completeness Reviewer
 */
(function () {
  "use strict";

  let debounceTimer = null;

  function initFormAssist() {
    // Only activate on application filing page
    const form = document.getElementById("applicationForm") || document.querySelector("form");
    if (!form || !document.getElementById("projectCost")) return;

    // Attach listener for dynamic suggestions
    const triggerFields = ["industryCategory", "projectCost", "landSize", "hazardous"];
    triggerFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", triggerSuggestions);
        el.addEventListener("input", () => {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(triggerSuggestions, 600);
        });
      }
    });

    // Inject Completeness Checker Button near Submit
    const submitBtn = document.getElementById("btnSubmitApp") || document.querySelector("button[type='submit']");
    if (submitBtn && !document.getElementById("btnAiCompletenessCheck")) {
      const chkBtn = document.createElement("button");
      chkBtn.type = "button";
      chkBtn.id = "btnAiCompletenessCheck";
      chkBtn.className = "btn outline";
      chkBtn.style.cssText = "margin-right:10px;border-color:#134074;color:#134074;font-weight:700;";
      chkBtn.innerHTML = "🔍 AI Pre-Submission Scrutiny Check";
      chkBtn.onclick = runCompletenessReview;
      submitBtn.parentNode.insertBefore(chkBtn, submitBtn);
    }

    createCompletenessModal();
  }

  async function triggerSuggestions() {
    const appData = {
      industry_category: document.getElementById("industryCategory")?.value || "",
      project_cost: parseFloat(document.getElementById("projectCost")?.value) || 0,
      land_size: parseFloat(document.getElementById("landSize")?.value) || 0,
      hazardous: document.getElementById("hazardous")?.checked,
      water_use: parseFloat(document.getElementById("waterUse")?.value) || 0,
      electricity: parseFloat(document.getElementById("electricity")?.value) || 0,
    };

    try {
      const resp = await fetch("/api/ai/form/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: appData }),
      });
      const data = await resp.json();

      if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach((sug) => renderFieldSuggestion(sug));
      }
    } catch (_) {}
  }

  function renderFieldSuggestion(sug) {
    let targetEl = null;
    if (sug.field === "hazardous") targetEl = document.getElementById("hazardous");
    else if (sug.field === "water_use") targetEl = document.getElementById("waterUse");
    else if (sug.field === "electricity") targetEl = document.getElementById("electricity");

    if (!targetEl) return;

    let tip = document.getElementById(`ai-sug-${sug.field}`);
    if (!tip) {
      tip = document.createElement("div");
      tip.id = `ai-sug-${sug.field}`;
      tip.style.cssText = "font-size:0.75rem;color:var(--info-ink);background:var(--info-bg);border:1px solid var(--info-line);border-radius:6px;padding:4px 8px;margin-top:4px;display:flex;align-items:center;justify-content:space-between;";
      targetEl.parentNode.appendChild(tip);
    }

    tip.innerHTML = `
      <span>💡 AI Suggestion: <strong>${sug.value}</strong> (${sug.reason})</span>
      <button type="button" class="btn sm" style="padding:2px 6px;font-size:0.7rem;background:var(--info-ink);color:#fff;border:none;border-radius:4px;cursor:pointer;margin-left:8px;">Apply</button>
    `;

    tip.querySelector("button").onclick = () => {
      if (sug.field === "hazardous") targetEl.checked = !!sug.value;
      else targetEl.value = sug.value;
      tip.remove();
      if (typeof window.runKnowledgeEngine === "function") window.runKnowledgeEngine();
    };
  }

  function createCompletenessModal() {
    if (document.getElementById("ai-completeness-modal")) return;

    const modal = document.createElement("div");
    modal.id = "ai-completeness-modal";
    modal.className = "modal-overlay";
    modal.style.cssText = "display:none;";
    modal.innerHTML = `
      <div class="modal-card lg">
        <div style="background:linear-gradient(135deg, #0b2545 0%, #134074 100%);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;margin:-28px -28px 18px -28px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h4 style="margin:0;font-size:1.1rem;color:#ffffff;">🔍 AI Pre-Submission Scrutiny Readiness</h4>
            <span style="font-size:0.75rem;opacity:0.85;color:rgba(255,255,255,0.85);">Cross-field validation and document checklist audit</span>
          </div>
          <button class="btn sm outline" style="color:#fff;border-color:rgba(255,255,255,0.4);" id="compCloseBtn">✕</button>
        </div>

        <div style="overflow-y:auto;display:flex;flex-direction:column;gap:16px;" id="compModalBody">
          <div style="display:flex;align-items:center;gap:14px;background:var(--surface-card-alt);padding:14px;border-radius:10px;border:1px solid var(--line);">
            <div id="compScoreCircle" style="width:60px;height:60px;border-radius:50%;background:var(--info-bg);color:var(--info-ink);border:1px solid var(--info-line);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.2rem;">--%</div>
            <div>
              <div style="font-weight:700;font-size:0.95rem;color:var(--ink);" id="compStatusTitle">Evaluating application readiness...</div>
              <div style="font-size:0.8rem;color:var(--ink-muted);" id="compStatusSub">Auditing statutory parameters against MPCB, MIDC, and DISH rules.</div>
            </div>
          </div>

          <div id="compInconsistenciesSection" style="display:none;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--err-ink);margin-bottom:6px;">⚠️ Cross-Field Inconsistencies Detected:</div>
            <div id="compInconsistenciesList" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>

          <div id="compMissingSection" style="display:none;">
            <div style="font-weight:700;font-size:0.88rem;color:var(--warn-ink);margin-bottom:6px;">📄 Missing Statutory Blueprints / Attachments:</div>
            <div id="compMissingList" style="display:flex;flex-direction:column;gap:6px;"></div>
          </div>
        </div>

        <div class="modal-actions" style="justify-content:space-between;">
          <span style="font-size:0.75rem;color:var(--ink-muted);">Filing high-completeness applications reduces query turnaround time by ~65%.</span>
          <div style="display:flex;gap:8px;">
            <button class="btn outline sm" id="compCloseBtn2">Review Application</button>
            <button class="btn primary sm" id="compProceedSubmitBtn" style="background:var(--brand-emerald);">Proceed to Submit →</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("compCloseBtn").onclick = () => { modal.style.display = "none"; modal.classList.remove("open"); };
    document.getElementById("compCloseBtn2").onclick = () => { modal.style.display = "none"; modal.classList.remove("open"); };
    document.getElementById("compProceedSubmitBtn").onclick = () => {
      modal.style.display = "none";
      modal.classList.remove("open");
      const submitBtn = document.getElementById("btnSubmitApp");
      if (submitBtn) submitBtn.click();
    };
  }

  async function runCompletenessReview() {
    const modal = document.getElementById("ai-completeness-modal");
    modal.style.display = "flex";

    const appData = {
      company_name: document.getElementById("companyName")?.value || "",
      industry_category: document.getElementById("industryCategory")?.value || "",
      project_cost: parseFloat(document.getElementById("projectCost")?.value) || 0,
      land_size: parseFloat(document.getElementById("landSize")?.value) || 0,
      hazardous: document.getElementById("hazardous")?.checked,
      water_use: parseFloat(document.getElementById("waterUse")?.value) || 0,
      electricity: parseFloat(document.getElementById("electricity")?.value) || 0,
      district: document.getElementById("district")?.value || "Pune",
    };

    // Grab currently listed uploaded docs if available
    const docs = [];
    document.querySelectorAll("[data-uploaded-doc-name]").forEach((el) => {
      docs.push({ name: el.textContent.trim() });
    });

    try {
      const resp = await fetch("/api/ai/form/completeness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application: appData, documents: docs }),
      });
      const data = await resp.json();

      const pct = Math.round(data.completeness_score * 100);
      const circle = document.getElementById("compScoreCircle");
      circle.textContent = `${pct}%`;
      circle.style.background = pct >= 80 ? "#dcfce7" : pct >= 50 ? "#ffedd5" : "#fee2e2";
      circle.style.color = pct >= 80 ? "#15803d" : pct >= 50 ? "#c2410c" : "#b91c1c";

      document.getElementById("compStatusTitle").textContent =
        data.is_complete ? "Application Verified: Ready for Submission" : "Scrutiny Readiness Review: Deficiencies Identified";
      document.getElementById("compStatusSub").textContent =
        data.is_complete ? "All statutory parameters and mandatory document schemas match Maharashtra norms." : "Resolving items below prevents rejection or formal deficiency notices from reviewing departments.";

      // Inconsistencies
      const incSec = document.getElementById("compInconsistenciesSection");
      const incList = document.getElementById("compInconsistenciesList");
      incList.innerHTML = "";
      if (data.inconsistencies && data.inconsistencies.length > 0) {
        incSec.style.display = "block";
        data.inconsistencies.forEach((inc) => {
          const item = document.createElement("div");
          item.style.cssText = "background:#fef2f2;border:1px solid #fecaca;padding:8px 12px;border-radius:6px;font-size:0.8rem;color:#991b1b;";
          item.innerHTML = `<strong>${inc.field}:</strong> ${inc.issue}`;
          incList.appendChild(item);
        });
      } else {
        incSec.style.display = "none";
      }

      // Missing
      const misSec = document.getElementById("compMissingSection");
      const misList = document.getElementById("compMissingList");
      misList.innerHTML = "";
      if (data.missing_items && data.missing_items.length > 0) {
        misSec.style.display = "block";
        data.missing_items.forEach((m) => {
          const item = document.createElement("div");
          item.style.cssText = "background:#fff7ed;border:1px solid #fed7aa;padding:8px 12px;border-radius:6px;font-size:0.8rem;color:#9a3412;";
          item.innerHTML = `<strong>Phase ${m.phase} (${m.department}):</strong> ${m.item} — <em>${m.reason}</em>`;
          misList.appendChild(item);
        });
      } else {
        misSec.style.display = "none";
      }
    } catch (err) {
      (window.notify || alert)("Completeness check failed: " + err.message, "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFormAssist);
  } else {
    initFormAssist();
  }
})();

