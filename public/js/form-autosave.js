"use strict";
/**
 * Udyog Samyog — Form Auto-Save & Draft Recovery Engine
 * 
 * Provides continuous, debounced client-side auto-saving in localStorage.
 * Detects unsaved application progress and offers 1-click restoration.
 */

(function () {
  const DRAFT_KEY = "udyog_samyog_app_draft";
  const DEBOUNCE_MS = 800;
  let saveTimer = null;

  function initAutoSave() {
    const form = document.querySelector("#applicationForm") || document.querySelector("form");
    if (!form) return;

    // Create status indicator
    let badge = document.getElementById("autoSaveBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "autoSaveBadge";
      badge.style.cssText = `
        position: fixed; bottom: 20px; right: 85px; z-index: 1000;
        background: #1e293b; color: #f8fafc; padding: 0.45rem 0.85rem;
        border-radius: 20px; font-size: 0.78rem; font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex;
        align-items: center; gap: 0.4rem; border: 1px solid #334155;
        transition: opacity 0.3s ease; opacity: 0; pointer-events: none;
      `;
      badge.innerHTML = `
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
        <span id="autoSaveText">Draft auto-saved</span>
      `;
      document.body.appendChild(badge);
    }

    // Check for existing draft on load
    checkExistingDraft(form);

    // Bind input change listeners
    form.addEventListener("input", () => triggerDebouncedSave(form, badge));
    form.addEventListener("change", () => triggerDebouncedSave(form, badge));

    // Clear draft on successful form submit
    form.addEventListener("submit", () => {
      localStorage.removeItem(DRAFT_KEY);
    });
  }

  function triggerDebouncedSave(form, badge) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveFormData(form, badge);
    }, DEBOUNCE_MS);
  }

  function saveFormData(form, badge) {
    const data = {};
    const elements = form.elements;
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!el.name || el.type === "password" || el.type === "file" || el.type === "submit") continue;
      if (el.type === "checkbox") {
        data[el.name] = el.checked;
      } else if (el.type === "radio") {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    }

    const payload = {
      savedAt: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      data,
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      if (badge) {
        const textEl = badge.querySelector("#autoSaveText");
        if (textEl) textEl.textContent = `Draft auto-saved at ${payload.savedAt}`;
        badge.style.opacity = "1";
        setTimeout(() => {
          if (badge) badge.style.opacity = "0";
        }, 2500);
      }
    } catch (_) {}
  }

  function checkExistingDraft(form) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || !draft.data || Object.keys(draft.data).length === 0) return;

      // Only prompt if form is largely empty
      const companyField = form.elements["companyName"] || form.elements["company_name"];
      if (companyField && companyField.value && companyField.value.trim().length > 0) return;

      const promptDiv = document.createElement("div");
      promptDiv.id = "draftRestorePrompt";
      promptDiv.style.cssText = `
        background: #eff6ff; border: 1px solid #bfdbfe; color: #1e3a8a;
        padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.25rem;
        display: flex; justify-content: space-between; align-items: center;
        font-size: 0.85rem; font-weight: 500;
      `;
      promptDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <svg width="18" height="18" fill="none" stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <span>Unsaved application draft from <strong>${draft.savedAt || "earlier"}</strong> was found.</span>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button type="button" id="btnRestoreDraft" style="background:#2563eb; color:#ffffff; border:none; padding:0.35rem 0.75rem; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.8rem;">
            Restore Draft
          </button>
          <button type="button" id="btnDiscardDraft" style="background:#e2e8f0; color:#475569; border:none; padding:0.35rem 0.6rem; border-radius:4px; font-weight:600; cursor:pointer; font-size:0.8rem;">
            Discard
          </button>
        </div>
      `;

      form.parentNode.insertBefore(promptDiv, form);

      document.getElementById("btnRestoreDraft").addEventListener("click", () => {
        for (const [key, val] of Object.entries(draft.data)) {
          const el = form.elements[key];
          if (!el) continue;
          if (el.type === "checkbox") {
            el.checked = !!val;
          } else if (el.type === "radio") {
            if (el.value === val) el.checked = true;
          } else {
            el.value = val;
            // Dispatch input event to trigger any reactive listeners
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
        promptDiv.remove();
      });

      document.getElementById("btnDiscardDraft").addEventListener("click", () => {
        localStorage.removeItem(DRAFT_KEY);
        promptDiv.remove();
      });
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAutoSave);
  } else {
    initAutoSave();
  }
})();

