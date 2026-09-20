/**
 * Udyog Samyog — Module C: Document Intelligence & Extraction Review UI
 */
(function () {
  "use strict";

  function createDocIntelModal() {
    if (document.getElementById("ai-docintel-modal")) return;

    const modal = document.createElement("div");
    modal.id = "ai-docintel-modal";
    modal.className = "modal-overlay";
    modal.style.cssText = "display:none;";
    modal.innerHTML = `
      <div class="modal-card lg">
        <div style="background:linear-gradient(135deg, #0b2545 0%, #134074 100%);color:#fff;padding:16px 20px;border-radius:12px 12px 0 0;margin:-28px -28px 18px -28px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h4 style="margin:0;font-size:1.1rem;color:#ffffff;">📄 AI Document Extraction & Human Review</h4>
            <span style="font-size:0.75rem;opacity:0.85;color:rgba(255,255,255,0.85);" id="docIntelDocName">Document Review</span>
          </div>
          <button class="btn sm outline" style="color:#fff;border-color:rgba(255,255,255,0.4);" id="docIntelCloseBtn">✕</button>
        </div>

        <div style="overflow-y:auto;display:flex;flex-direction:column;gap:16px;">
          <!-- Classification Banner -->
          <div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-card-alt);padding:12px 16px;border-radius:8px;border:1px solid var(--line);">
            <div>
              <div style="font-size:0.75rem;color:var(--ink-muted);text-transform:uppercase;font-weight:700;">Identified Classification</div>
              <div style="font-weight:800;font-size:1rem;color:var(--navy);" id="docIntelType">Analyzing...</div>
            </div>
            <div id="docIntelConfidenceBadge" style="background:var(--ok-bg);color:var(--ok-ink);border:1px solid var(--ok-line);padding:4px 10px;border-radius:12px;font-weight:700;font-size:0.8rem;">
              95% Confidence
            </div>
          </div>

          <!-- Extracted Fields Table -->
          <div>
            <div style="font-weight:700;font-size:0.88rem;color:var(--ink);margin-bottom:8px;">Structured Fields Extracted via Optical Intelligence:</div>
            <div class="table-container" style="margin:0;">
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;" id="docIntelFieldsTable">
                <thead>
                  <tr style="background:var(--surface-card-alt);border-bottom:2px solid var(--line);">
                    <th style="text-align:left;padding:8px 12px;color:var(--ink-muted);">Attribute</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--ink-muted);">Extracted Value</th>
                    <th style="text-align:left;padding:8px 12px;color:var(--ink-muted);">Score</th>
                  </tr>
                </thead>
                <tbody id="docIntelFieldsTbody"></tbody>
              </table>
            </div>
          </div>

          <div style="background:var(--info-bg);border-left:4px solid var(--info-line);padding:10px 14px;border-radius:4px;font-size:0.8rem;color:var(--info-ink);">
            <strong>Human Verification Note:</strong> Enterprise applicants and reviewing officers retain absolute authority to confirm or modify extracted values. Statutory clearance decisions require verified human sign-off.
          </div>
        </div>

        <div class="modal-actions" style="justify-content:space-between;">
          <span style="font-size:0.75rem;color:var(--ink-muted);" id="docIntelStatusText">Status: Extracted</span>
          <div style="display:flex;gap:8px;">
            <button class="btn outline sm" id="docIntelCloseBtn2">Cancel</button>
            <button class="btn primary sm" id="docIntelConfirmBtn" style="background:var(--brand-emerald);">✓ Confirm & Validate Values</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("docIntelCloseBtn").onclick = () => (modal.style.display = "none");
    document.getElementById("docIntelCloseBtn2").onclick = () => (modal.style.display = "none");
  }

  window.openDocIntelReview = async function (documentId, documentName) {
    createDocIntelModal();
    const modal = document.getElementById("ai-docintel-modal");
    modal.style.display = "flex";

    document.getElementById("docIntelDocName").textContent = documentName || `Document ID: ${documentId}`;
    document.getElementById("docIntelType").textContent = "Processing extraction...";
    const tbody = document.getElementById("docIntelFieldsTbody");
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:16px;">Extracting document text and verifying schemas... ⏳</td></tr>`;

    try {
      // First process or retrieve extraction
      const resp = await fetch("/api/ai/docs/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId, file_path: documentName }),
      });
      const data = await resp.json();

      document.getElementById("docIntelType").textContent = data.doc_type || "Statutory Document";
      const conf = Math.round((data.doc_type_confidence || 0.9) * 100);
      const confBadge = document.getElementById("docIntelConfidenceBadge");
      confBadge.textContent = `${conf}% Confidence`;
      confBadge.style.background = conf >= 85 ? "#dcfce7" : "#ffedd5";
      confBadge.style.color = conf >= 85 ? "#15803d" : "#c2410c";

      tbody.innerHTML = "";
      const fields = data.fields || {};
      const confs = data.field_confidences || {};

      for (const [k, v] of Object.entries(fields)) {
        const tr = document.createElement("tr");
        tr.style.borderBottom = "1px solid #e2e8f0";
        const fScore = confs[k] ? Math.round(confs[k] * 100) + "%" : "90%";
        tr.innerHTML = `
          <td style="padding:8px 12px;font-weight:600;color:#334155;text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
          <td style="padding:8px 12px;"><input type="text" value="${v}" style="width:100%;padding:4px 8px;border:1px solid #cbd5e1;border-radius:4px;font-size:0.85rem;" data-field-key="${k}"></td>
          <td style="padding:8px 12px;"><span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-size:0.75rem;font-weight:700;">${fScore}</span></td>
        `;
        tbody.appendChild(tr);
      }

      document.getElementById("docIntelConfirmBtn").onclick = async () => {
        const confirmed = {};
        tbody.querySelectorAll("input[data-field-key]").forEach((input) => {
          confirmed[input.getAttribute("data-field-key")] = input.value.trim();
        });

        await fetch(`/api/ai/docs/${documentId}/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed_fields: confirmed }),
        });

        (window.notify || alert)("Document extraction values verified and confirmed successfully!", "success");
        modal.style.display = "none";
      };
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:#b91c1c;padding:16px;">Extraction failed: ${err.message}</td></tr>`;
    }
  };
})();

