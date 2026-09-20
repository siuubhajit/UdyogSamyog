/**
 * Udyog Samyog — Module D: Officer Copilot & Deficiency Notice Drafter
 */
(function () {
  "use strict";

  window.renderOfficerCopilotBrief = async function (appId, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = `<div style="padding:16px;text-align:center;color:#64748b;">Loading Officer Copilot Brief... ⏳</div>`;

    try {
      const resp = await fetch("/api/ai/copilot/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: appId }),
      });
      const brief = await resp.json();

      let discCards = "";
      if (brief.discrepancies && brief.discrepancies.length > 0) {
        discCards = `<div style="margin-top:12px;"><div style="font-weight:700;font-size:0.85rem;color:var(--err-ink);margin-bottom:6px;">⚠️ Discrepancy Alerts for Reviewing Officer:</div>`;
        brief.discrepancies.forEach((d) => {
          discCards += `
            <div style="background:var(--err-bg);border:1px solid var(--err-line);padding:10px 14px;border-radius:8px;margin-bottom:6px;font-size:0.84rem;">
              <div style="font-weight:700;color:var(--err-ink);">${d.title}</div>
              <div style="color:var(--ink-secondary);font-size:0.8rem;margin-top:2px;">${d.description}</div>
            </div>
          `;
        });
        discCards += `</div>`;
      }

      let checklistItems = "";
      if (brief.checklist_pre_verification && brief.checklist_pre_verification.length > 0) {
        checklistItems = `<div style="margin-top:14px;"><div style="font-weight:700;font-size:0.85rem;color:var(--ink);margin-bottom:6px;">📋 Clearance Checklist Pre-Verification:</div><div style="display:flex;flex-direction:column;gap:6px;">`;
        brief.checklist_pre_verification.forEach((c) => {
          const isReady = c.pre_status.includes("Ready");
          checklistItems += `
            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-card);border:1px solid var(--line);padding:8px 12px;border-radius:6px;font-size:0.82rem;">
              <div>
                <strong style="color:var(--ink);">Phase ${c.phase}: ${c.clearance}</strong>
                <span style="font-size:0.75rem;color:var(--ink-muted);margin-left:6px;">(${c.department})</span>
              </div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="background:${isReady ? 'var(--ok-bg)' : 'var(--err-bg)'};color:${isReady ? 'var(--ok-ink)' : 'var(--err-ink)'};border:1px solid ${isReady ? 'var(--ok-line)' : 'var(--err-line)'};padding:2px 8px;border-radius:12px;font-weight:700;font-size:0.75rem;">${c.pre_status}</span>
                <button class="btn sm outline" style="padding:2px 6px;font-size:0.7rem;" onclick="this.textContent = this.textContent === 'Override' ? 'Overridden ✓' : 'Override'">Override</button>
              </div>
            </div>
          `;
        });
        checklistItems += `</div></div>`;
      }

      containerEl.innerHTML = `
        <div style="background:var(--surface-card);border:1.5px solid var(--line);border-radius:12px;padding:18px;margin-bottom:20px;box-shadow:var(--shadow-sm);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="background:#134074;color:#fff;padding:3px 8px;border-radius:6px;font-weight:800;font-size:0.75rem;">OFFICER COPILOT</span>
                <span style="font-size:0.85rem;color:var(--ink-muted);">Automated Scrutiny Synthesis</span>
              </div>
              <h4 style="margin:6px 0 0 0;font-size:1.1rem;color:var(--navy);">${brief.company_name} (${brief.application_no})</h4>
            </div>

            <div style="display:flex;gap:8px;">
              <span style="background:var(--info-bg);color:var(--info-ink);border:1px solid var(--info-line);padding:4px 10px;border-radius:14px;font-weight:700;font-size:0.8rem;">${brief.msme_category}</span>
              <span style="background:${brief.risk_tier === 'Red' ? 'var(--err-bg)' : 'var(--warn-bg)'};color:${brief.risk_tier === 'Red' ? 'var(--err-ink)' : 'var(--warn-ink)'};border:1px solid ${brief.risk_tier === 'Red' ? 'var(--err-line)' : 'var(--warn-line)'};padding:4px 10px;border-radius:14px;font-weight:700;font-size:0.8rem;">${brief.risk_tier} Risk</span>
            </div>
          </div>

          <p style="font-size:0.88rem;color:var(--ink-secondary);line-height:1.5;margin:12px 0 6px 0;">${brief.summary}</p>

          <div style="display:flex;gap:16px;background:var(--surface-card-alt);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-top:10px;font-size:0.82rem;flex-wrap:wrap;color:var(--ink);">
            <div><strong>Documents:</strong> ${brief.verified_documents}/${brief.total_documents} Verified</div>
            <div><strong>Active Queries:</strong> ${brief.open_queries}</div>
            <div><strong>Suggested Action:</strong> <span style="color:var(--navy);font-weight:700;">${brief.suggested_next_action}</span></div>
          </div>

          ${discCards}
          ${checklistItems}

          <div style="display:flex;justify-content:flex-end;margin-top:14px;gap:10px;">
            <button class="btn outline sm" id="btnDraftQueryNotice" style="border-color:var(--err-ink);color:var(--err-ink);font-weight:700;">✍️ Draft Statutory Deficiency Notice</button>
          </div>
        </div>
      `;

      const draftBtn = document.getElementById("btnDraftQueryNotice");
      if (draftBtn) {
        draftBtn.onclick = () => openDraftQueryModal(brief);
      }
    } catch (err) {
      containerEl.innerHTML = `<div style="color:var(--err-ink);padding:12px;">Officer Copilot offline: ${err.message}</div>`;
    }
  };

  function openDraftQueryModal(brief) {
    let modal = document.getElementById("ai-draft-query-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "ai-draft-query-modal";
      modal.className = "modal-overlay";
      modal.style.cssText = "display:none;";
      modal.innerHTML = `
        <div class="modal-card lg">
          <div style="background:linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;margin:-28px -28px 20px -28px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h4 style="margin:0;font-size:1.1rem;color:#ffffff;">✍️ Draft Statutory Deficiency Notice</h4>
              <span style="font-size:0.75rem;opacity:0.85;color:rgba(255,255,255,0.85);">Grounded in Water Act & Factories Act regulations</span>
            </div>
            <button class="btn sm outline" style="color:#fff;border-color:rgba(255,255,255,0.4);" id="draftQueryCloseBtn">✕</button>
          </div>

          <div style="overflow-y:auto;display:flex;flex-direction:column;gap:12px;">
            <label style="font-weight:700;font-size:0.82rem;color:var(--ink);">Statutory Notice Body (Review & Edit before Dispatch):</label>
            <textarea id="draftQueryText" rows="10" style="width:100%;font-family:monospace;font-size:0.85rem;padding:10px;border:1px solid var(--line);background:var(--surface-card-alt);color:var(--ink);border-radius:6px;line-height:1.45;"></textarea>
            <div style="font-size:0.78rem;color:var(--ink-muted);">Notice automatically enforces a 7-working-day reply window under the Maharashtra Right to Public Services Act 2015.</div>
          </div>

          <div class="modal-actions">
            <button class="btn outline sm" id="draftQueryCloseBtn2">Cancel</button>
            <button class="btn primary sm" id="draftQuerySendBtn" style="background:#b91c1c;">Dispatch Formal Deficiency Notice</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById("draftQueryCloseBtn").onclick = () => { modal.style.display = "none"; modal.classList.remove("open"); };
      document.getElementById("draftQueryCloseBtn2").onclick = () => { modal.style.display = "none"; modal.classList.remove("open"); };
    }

    modal.style.display = "flex";
    modal.classList.add("open");
    const textarea = document.getElementById("draftQueryText");
    textarea.value = "Drafting formal statutory query... ⏳";

    fetch("/api/ai/copilot/draft-query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application: { application_no: brief.application_no, company_name: brief.company_name },
        missing_items: brief.discrepancies || [{ item: "Required statutory documentation" }],
      }),
    })
      .then((r) => r.json())
      .then((res) => {
        textarea.value = res.notice_text;
      })
      .catch((e) => {
        textarea.value = `DEFICIENCY NOTICE\nApplication: ${brief.application_no}\nTo: ${brief.company_name}\n\nSir/Madam,\nKindly furnish supporting documents within 7 working days.`;
      });

    document.getElementById("draftQuerySendBtn").onclick = async () => {
      const qText = textarea.value.trim();
      if (!qText) return;

      try {
        // Post query via portal endpoint
        const qResp = await fetch("/api/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            application_id: brief.application_id || brief.application_no,
            query_text: qText,
            subject: `Deficiency Notice: ${brief.application_no}`,
          }),
        });
        alert("Statutory Deficiency Notice dispatched to applicant dossier successfully!");
        modal.style.display = "none";
        if (typeof window.refreshOfficerQueries === "function") window.refreshOfficerQueries();
      } catch (err) {
        alert("Failed to dispatch query: " + err.message);
      }
    };
  }
})();

