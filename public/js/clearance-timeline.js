/**
 * Unified ClearanceTimeline Component
 * Supports 3 display modes:
 * - 'compact'  (Applicant Dashboard table & summary)
 * - 'detailed' (Tracker Page with interactive phase drill-down)
 * - 'officer'  (Verification Workspace scrutiny summary)
 */

function renderClearanceTimeline(application, options = {}) {
  const mode = options.mode || "compact";
  const container = options.container
    ? (typeof options.container === "string" ? document.getElementById(options.container) : options.container)
    : null;

  if (!application) return "";

  let stageStatuses = {};
  try {
    stageStatuses = typeof application.stage_statuses === "string"
      ? JSON.parse(application.stage_statuses || "{}")
      : (application.stage_statuses || application.stageStatuses || {});
  } catch (_) {
    stageStatuses = {};
  }

  const currentStage = application.current_stage || application.currentStage || "mpcb";
  const overallStatus = application.status || "In Progress";

  function safeGetStageDecision(dept) {
    if (stageStatuses[dept]?.decision) return stageStatuses[dept].decision;
    return null;
  }

  const isFinalApproved = overallStatus === "Approved" || safeGetStageDecision("msins") === "Approved";
  const isRejected = overallStatus === "Rejected";

  // Phase 1: MPCB Environmental Review
  const mpcbDec = safeGetStageDecision("mpcb");
  const isP1Done = mpcbDec === "Approved" || ["parallel_scrutiny", "midc", "dish", "fire", "msins", "completed"].includes(currentStage) || isFinalApproved;
  const p1StatusText = isP1Done ? "Approved" : (currentStage === "mpcb" ? (overallStatus === "Flagged" ? "Query Raised" : "In Review") : "Pending");
  const p1Class = isP1Done ? "done" : (currentStage === "mpcb" ? "active" : "pending");

  // Phase 2: Parallel Scrutiny (MIDC, DISH, FIRE)
  const parallelDepts = ["midc", "dish", "fire"];
  const approvedParallelCount = parallelDepts.filter((d) => safeGetStageDecision(d) === "Approved").length;
  const isP2Done = approvedParallelCount === 3 || isFinalApproved;
  const isP2Active = ["parallel_scrutiny", "midc", "dish", "fire"].includes(currentStage);
  const p2StatusText = isP2Done ? "All 3 Approved" : (isP2Active ? `${approvedParallelCount} of 3 approved` : (isP1Done ? "Under Review" : "Waiting"));
  const p2Class = isP2Done ? "done" : (isP2Active ? "active" : "pending");

  // Phase 3: Final State Sanction (MSINS Apex Authority)
  const msinsDec = safeGetStageDecision("msins");
  const isP3Done = isFinalApproved || msinsDec === "Approved";
  const p3StatusText = isP3Done ? "Sanctioned" : (currentStage === "msins" ? "In Review" : "Waiting");
  const p3Class = isP3Done ? "done" : (currentStage === "msins" ? "active" : "pending");

  const safeEscape = typeof escapeHtml === "function" ? escapeHtml : (str) => String(str || "").replace(/[&<>"']/g, "");

  let html = "";

  /* ─── 1. COMPACT MODE (Applicant Dashboard) ─── */
  if (mode === "compact") {
    html = `
      <div class="clearance-timeline clearance-timeline--compact" style="display:flex;align-items:center;gap:12px;background:var(--color-surface-page, #f8fafc);border:1px solid var(--color-border, #e2e8f0);border-radius:10px;padding:10px 14px;margin-top:6px;">
        <div class="timeline-step timeline-step--${p1Class}" style="display:flex;align-items:center;gap:8px;flex:1;">
          <div class="timeline-step-badge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;background:${isP1Done ? '#10b981' : (p1Class === 'active' ? '#f59e0b' : '#cbd5e1')};color:#fff;">
            ${isP1Done ? '✓' : '1'}
          </div>
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-primary, #0f172a);">Phase 1: Environmental</div>
            <div style="font-size:0.7rem;color:${isP1Done ? '#059669' : '#64748b'};font-weight:600;">${p1StatusText}</div>
          </div>
        </div>

        <div style="color:var(--color-border, #cbd5e1);">&rarr;</div>

        <div class="timeline-step timeline-step--${p2Class}" style="display:flex;align-items:center;gap:8px;flex:1;">
          <div class="timeline-step-badge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;background:${isP2Done ? '#10b981' : (p2Class === 'active' ? '#f59e0b' : '#cbd5e1')};color:#fff;">
            ${isP2Done ? '✓' : '2'}
          </div>
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-primary, #0f172a);">Phase 2: Civil, Safety &amp; Fire</div>
            <div style="font-size:0.7rem;color:${isP2Done ? '#059669' : '#64748b'};font-weight:600;">${p2StatusText}</div>
          </div>
        </div>

        <div style="color:var(--color-border, #cbd5e1);">&rarr;</div>

        <div class="timeline-step timeline-step--${p3Class}" style="display:flex;align-items:center;gap:8px;flex:1;">
          <div class="timeline-step-badge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;background:${isP3Done ? '#10b981' : (p3Class === 'active' ? '#f59e0b' : '#cbd5e1')};color:#fff;">
            ${isP3Done ? '✓' : '3'}
          </div>
          <div>
            <div style="font-size:0.75rem;font-weight:700;color:var(--color-text-primary, #0f172a);">Phase 3: Final Approval</div>
            <div style="font-size:0.7rem;color:${isP3Done ? '#059669' : '#64748b'};font-weight:600;">${p3StatusText}</div>
          </div>
        </div>
      </div>
    `;
  }

  /* ─── 2. DETAILED MODE (Tracker Page with interactive drill-down) ─── */
  else if (mode === "detailed") {
    html = `
      <div class="clearance-timeline clearance-timeline--detailed" style="display:flex;flex-direction:column;gap:14px;">
        <!-- Header Banner -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:var(--surface-card);border:1px solid var(--line);border-radius:10px;">
          <div>
            <h3 style="margin:0;font-size:1.05rem;color:var(--navy);display:flex;align-items:center;gap:8px;">
              <span>🏛️</span> Maharashtra Single-Window Statutory Clearance Pipeline
            </h3>
            <div style="font-size:0.78rem;color:var(--ink-light);margin-top:2px;">
              Click any statutory phase below to inspect officer remarks, checklists, and clearance decisions.
            </div>
          </div>
          <span class="badge ${isFinalApproved ? 'green' : (overallStatus === 'Flagged' ? 'yellow' : 'blue')}" style="font-size:0.82rem;padding:5px 12px;">
            ● ${isFinalApproved ? 'Consolidated License Issued' : overallStatus}
          </span>
        </div>

        <!-- Phase 1 Card -->
        <div class="timeline-phase-card ${p1Class}" style="border:1.5px solid ${isP1Done ? '#10b981' : (p1Class === 'active' ? '#f59e0b' : 'var(--line)')};border-radius:12px;padding:16px;background:var(--surface-card);cursor:pointer;" onclick="toggleTimelinePhase(this)">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="width:28px;height:28px;border-radius:50%;background:${isP1Done ? '#10b981' : '#f59e0b'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
                ${isP1Done ? '✓' : '1'}
              </span>
              <div>
                <b style="font-size:0.95rem;color:var(--navy);">Phase 1: Environmental Review &amp; Consent to Establish</b>
                <div style="font-size:0.75rem;color:var(--ink-light);">Maharashtra Pollution Control Board (MPCB) · Water &amp; Air Acts</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge ${isP1Done ? 'green' : 'saffron'}">${p1StatusText}</span>
              <span class="phase-expand-icon" style="font-size:0.75rem;color:var(--ink-light);">▾</span>
            </div>
          </div>
          <div class="phase-detail-body" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);font-size:0.82rem;">
            <div style="color:var(--ink-secondary);line-height:1.5;">
              Statutory verification of Environmental Management Plan, Effluent Treatment Plant sizing (KLD), stack height emission standards, and water balance.
            </div>
            ${stageStatuses.mpcb?.remarks ? `<div style="margin-top:8px;padding:8px 12px;background:var(--ok-bg);border:1px solid var(--ok-line);border-radius:6px;color:var(--ok-ink);"><b>MPCB Officer Remark:</b> "${safeEscape(stageStatuses.mpcb.remarks)}"</div>` : ''}
          </div>
        </div>

        <!-- Phase 2 Card -->
        <div class="timeline-phase-card ${p2Class}" style="border:1.5px solid ${isP2Done ? '#10b981' : (p2Class === 'active' ? '#2563eb' : 'var(--line)')};border-radius:12px;padding:16px;background:var(--surface-card);cursor:pointer;" onclick="toggleTimelinePhase(this)">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="width:28px;height:28px;border-radius:50%;background:${isP2Done ? '#10b981' : '#2563eb'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
                ${isP2Done ? '✓' : '2'}
              </span>
              <div>
                <b style="font-size:0.95rem;color:var(--navy);">Phase 2: Simultaneous Technical &amp; Safety Clearances</b>
                <div style="font-size:0.75rem;color:var(--ink-light);">MIDC (Civil), DISH (Safety), Fire Services (Life Safety) · Concurrent Review</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge ${isP2Done ? 'green' : 'blue'}">${p2StatusText}</span>
              <span class="phase-expand-icon" style="font-size:0.75rem;color:var(--ink-light);">▾</span>
            </div>
          </div>
          <div class="phase-detail-body" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);font-size:0.82rem;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;">
              ${parallelDepts.map((d) => {
                const dInfo = {
                  midc: { title: "MIDC Civil & Planning", act: "Building Bylaws & Setbacks" },
                  dish: { title: "DISH Occupational Safety", act: "Factories Act (Sec 16)" },
                  fire: { title: "Maharashtra Fire Services", act: "Life Safety & Hydrant Ring" }
                }[d];
                const dDec = safeGetStageDecision(d);
                const dDone = dDec === "Approved";
                const dRemark = stageStatuses[d]?.remarks;
                return `
                  <div style="padding:10px;border-radius:8px;border:1.5px solid ${dDone ? 'var(--ok-line)' : 'var(--line)'};background:${dDone ? 'var(--ok-bg)' : 'var(--surface-subtle)'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <b style="font-size:0.82rem;color:var(--navy);">${dInfo.title}</b>
                      <span class="badge ${dDone ? 'green' : 'gray'}" style="font-size:0.68rem;">${dDone ? '✓ Approved' : (dDec || 'Under Review')}</span>
                    </div>
                    <div style="font-size:0.72rem;color:var(--ink-light);margin-top:2px;">${dInfo.act}</div>
                    ${dRemark ? `<div style="margin-top:6px;font-size:0.75rem;color:var(--ink);font-style:italic;">"${safeEscape(dRemark)}"</div>` : ''}
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Phase 3 Card -->
        <div class="timeline-phase-card ${p3Class}" style="border:1.5px solid ${isP3Done ? '#10b981' : (p3Class === 'active' ? '#ea580c' : 'var(--line)')};border-radius:12px;padding:16px;background:var(--surface-card);cursor:pointer;" onclick="toggleTimelinePhase(this)">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="width:28px;height:28px;border-radius:50%;background:${isP3Done ? '#10b981' : '#ea580c'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
                ${isP3Done ? '✓' : '3'}
              </span>
              <div>
                <b style="font-size:0.95rem;color:var(--navy);">Phase 3: Apex Final Approval &amp; Consolidated License</b>
                <div style="font-size:0.75rem;color:var(--ink-light);">State Innovation Society / Directorate of Industries · Single Window Sign-Off</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="badge ${isP3Done ? 'emerald' : 'gray'}">${p3StatusText}</span>
              <span class="phase-expand-icon" style="font-size:0.75rem;color:var(--ink-light);">▾</span>
            </div>
          </div>
          <div class="phase-detail-body" style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--line);font-size:0.82rem;">
            ${isP3Done ? `
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                <div style="color:var(--ok-ink);font-weight:600;">
                  🎉 Single-window clearance sanctioned! Consolidated License with digitally verifiable QR code issued.
                </div>
                <a href="/pages/certificate.html?id=${application.id}" target="_blank" class="btn sm emerald" style="font-weight:700;" onclick="event.stopPropagation();">
                  📜 Download Statutory License
                </a>
              </div>
            ` : `
              <div style="color:var(--ink-light);">
                Awaiting sign-off from Directorate of Industries upon completion of technical approvals in Phase 2.
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  /* ─── 3. OFFICER MODE (Verification Workspace) ─── */
  else {
    html = `
      <div class="clearance-timeline clearance-timeline--officer" style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;padding:8px;background:var(--color-surface-page, #f8fafc);border-radius:8px;border:1px solid var(--color-border, #e2e8f0);">
        <div style="text-align:center;padding:4px;">
          <div style="font-size:0.72rem;color:var(--color-text-secondary, #64748b);font-weight:600;">Phase 1: Env</div>
          <span class="badge ${isP1Done ? 'green' : 'gray'}" style="font-size:0.68rem;padding:2px 6px;">${p1StatusText}</span>
        </div>
        <div style="text-align:center;padding:4px;border-left:1px solid var(--color-border, #e2e8f0);border-right:1px solid var(--color-border, #e2e8f0);">
          <div style="font-size:0.72rem;color:var(--color-text-secondary, #64748b);font-weight:600;">Phase 2: Tech</div>
          <span class="badge ${isP2Done ? 'green' : 'blue'}" style="font-size:0.68rem;padding:2px 6px;">${p2StatusText}</span>
        </div>
        <div style="text-align:center;padding:4px;">
          <div style="font-size:0.72rem;color:var(--color-text-secondary, #64748b);font-weight:600;">Phase 3: Apex</div>
          <span class="badge ${isP3Done ? 'emerald' : 'gray'}" style="font-size:0.68rem;padding:2px 6px;">${p3StatusText}</span>
        </div>
      </div>
    `;
  }

  if (container) {
    container.innerHTML = html;
  }
  return html;
}

function toggleTimelinePhase(cardEl) {
  if (!cardEl) return;
  const body = cardEl.querySelector(".phase-detail-body");
  const icon = cardEl.querySelector(".phase-expand-icon");
  if (!body) return;
  const isHidden = body.style.display === "none";
  body.style.display = isHidden ? "block" : "none";
  if (icon) icon.textContent = isHidden ? "▴" : "▾";
}

if (typeof window !== "undefined") {
  window.renderClearanceTimeline = renderClearanceTimeline;
  window.toggleTimelinePhase = toggleTimelinePhase;
}

