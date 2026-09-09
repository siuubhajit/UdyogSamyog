/**
 * Applicant Workflow Controller - Enterprise Applicant Dashboard & Tracker
 * Renders 3-Phase Multi-Department Clearance Matrix & Statutory Plan Tracking
 */

async function loadApplicantWorkflow(appId) {
  try {
    const data = await api(`/api/applications/${appId}`);
    renderWorkflowCard(data);
    return data;
  } catch (err) {
    console.error("Error loading applicant workflow:", err);
  }
}

function renderWorkflowCard(data) {
  const container = document.getElementById("applicantWorkflowContainer");
  if (!container) return;

  const stages = data.stageStatuses || {};
  const currentStage = data.current_stage || "mpcb";
  const overallStatus = data.status || "In Progress";

  const mpcb = stages.mpcb || {};
  const midc = stages.midc || {};
  const dish = stages.dish || {};
  const fire = stages.fire || {};
  const msins = stages.msins || {};

  const mpcbApproved = mpcb.decision === "Approved";
  const midcApproved = midc.decision === "Approved";
  const dishApproved = dish.decision === "Approved";
  const fireApproved = fire.decision === "Approved";
  const msinsApproved = msins.decision === "Approved" || overallStatus === "Approved";

  const isParallelActive = currentStage === "parallel_scrutiny";
  const isApexActive = currentStage === "msins";

  // Document Plans
  const envDoc = data.plans?.environmental || data.documents?.find(d => d.plan_type === "environmental_plan");
  const civilDoc = data.plans?.civil || data.documents?.find(d => d.plan_type === "civil_plan");
  const dishDoc = data.plans?.factorySafety || data.documents?.find(d => d.plan_type === "factory_safety_plan");
  const fireDoc = data.plans?.fireSafety || data.documents?.find(d => d.plan_type === "fire_safety_plan");

  const hazardText = data.hazardLevel || (data.hazardous ? "Chemical Hazard (High Risk)" : "Low Risk / General");

  container.innerHTML = `
    <div class="panel" style="border: 1.5px solid #cbd5e1; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 24px;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e2e8f0; padding-bottom:12px; margin-bottom:16px;">
        <div>
          <h2 style="margin:0; font-size:1.25rem; color:var(--navy);">
            🏛️ Maharashtra Single-Window Statutory Clearance Pipeline
          </h2>
          <p style="margin:4px 0 0 0; font-size:0.82rem; color:var(--ink-light);">
            Application No: <b>${data.application_no}</b> · Enterprise: <b>${data.company_name}</b> · District: <b>${data.district}</b>
          </p>
        </div>
        <div>
          <span class="badge ${overallStatus === 'Approved' ? 'green' : overallStatus === 'Flagged' ? 'yellow' : overallStatus === 'Rejected' ? 'red' : 'blue'}" style="font-size:0.85rem; padding:6px 14px;">
            ● ${overallStatus === 'Approved' ? 'Consolidated License Issued' : overallStatus}
          </span>
        </div>
      </div>

      <!-- Phase 1: Environmental Review First -->
      <div style="background:${mpcbApproved ? '#f0fdf4' : '#fffbeb'}; border:1.5px solid ${mpcbApproved ? '#86efac' : '#fde047'}; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">🌿</span>
              <h3 style="margin:0; font-size:1.05rem; color:#1e293b;">Phase 1: Maharashtra Pollution Control Board · Environmental Clearance</h3>
              <span class="badge ${mpcbApproved ? 'green' : 'yellow'}">
                ${mpcbApproved ? '✓ Cleared by Environment Officer' : 'Phase 1 Under Active Scrutiny'}
              </span>
            </div>
            <div style="font-size:0.75rem; color:#0f766e; font-weight:600; margin-top:2px;">Statutory Environmental Clearance under Water &amp; Air Pollution Control Acts</div>
            <p style="font-size:0.82rem; color:#475569; margin:6px 0 0 0;">
              Statutory review: Environmental Management Plan, Effluent Treatment Scheme, and Air Emission mitigation.
            </p>
            ${mpcb.remarks ? `<div style="font-size:0.82rem; color:#0f766e; background:#f0fdfa; padding:6px 10px; border-radius:4px; margin-top:8px;"><b>Officer Remarks:</b> "${mpcb.remarks}"</div>` : ''}
          </div>
          <div>
            ${envDoc ? `<a class="btn outline sm" href="/api/documents/${envDoc.id}/view" target="_blank">📄 View Environmental Plan PDF</a>` : '<span class="badge gray">No Plan Attached</span>'}
          </div>
        </div>
      </div>

      <!-- Phase 2: Simultaneous Departmental Scrutiny -->
      <div style="background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:8px; padding:16px; margin-bottom:18px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.2rem;">⚡</span>
            <h3 style="margin:0; font-size:1.05rem; color:var(--navy);">
              Phase 2: Simultaneous Departmental Scrutiny (Concurrent Review)
            </h3>
          </div>
          <span class="badge ${isParallelActive ? 'yellow' : mpcbApproved ? 'blue' : 'gray'}">
            ${isParallelActive ? 'Active Simultaneous Review' : mpcbApproved ? 'Phase 2 Completed' : 'Queued (Awaiting Environmental Clearance)'}
          </span>
        </div>
        <p style="font-size:0.82rem; color:var(--ink-light); margin-bottom:14px;">
          Once Environmental Clearance is secured, Civil, Factory Safety, and Fire departments evaluate your blueprints simultaneously:
        </p>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px;">
          <!-- 1. Civil Infrastructure -->
          <div style="background:#ffffff; border:1px solid ${midcApproved ? '#bbf7d0' : '#e2e8f0'}; border-radius:6px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:var(--navy);">📐 Industrial Development Corporation · Civil Infrastructure</b>
              <span class="badge ${midcApproved ? 'green' : isParallelActive ? 'yellow' : 'gray'}">${midcApproved ? 'Approved' : isParallelActive ? 'In Scrutiny' : 'Queued'}</span>
            </div>
            <div style="font-size:0.72rem; color:#1e40af; font-weight:600; margin-top:2px;">Maharashtra Industrial Development Corporation</div>
            <div style="font-size:0.78rem; color:#64748b; margin:6px 0;">Floor Space Index, building setbacks & vehicle driveway access under Regional and Town Planning standards.</div>
            ${midc.remarks ? `<div style="font-size:0.75rem; color:#15803d; background:#f0fdf4; padding:4px 8px; border-radius:4px; margin-bottom:8px;">"${midc.remarks}"</div>` : ''}
            ${civilDoc ? `<a class="btn outline sm" style="font-size:0.75rem; padding:4px 8px;" href="/api/documents/${civilDoc.id}/view" target="_blank">📄 View Civil Plan PDF</a>` : '<span style="font-size:0.75rem; color:#94a3b8;">Plan Pending</span>'}
          </div>

          <!-- 2. Factory Safety -->
          <div style="background:#ffffff; border:1px solid ${dishApproved ? '#bbf7d0' : '#e2e8f0'}; border-radius:6px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:var(--navy);">🛡️ Directorate of Industrial Safety & Health · Factory Safety</b>
              <span class="badge ${dishApproved ? 'green' : isParallelActive ? 'yellow' : 'gray'}">${dishApproved ? 'Approved' : isParallelActive ? 'In Scrutiny' : 'Queued'}</span>
            </div>
            <div style="font-size:0.72rem; color:#9a3412; font-weight:600; margin-top:2px;">Directorate of Industrial Safety & Health</div>
            <div style="margin:4px 0;"><span class="badge ${hazardText.includes('Chemical') ? 'red' : 'blue'}" style="font-size:0.7rem;">${hazardText}</span></div>
            <div style="font-size:0.78rem; color:#64748b; margin-bottom:6px;">Worker density (14.2 m³ air space), machine guarding & emergency egress under Factories Act 1948.</div>
            ${dish.remarks ? `<div style="font-size:0.75rem; color:#15803d; background:#f0fdf4; padding:4px 8px; border-radius:4px; margin-bottom:8px;">"${dish.remarks}"</div>` : ''}
            ${dishDoc ? `<a class="btn outline sm" style="font-size:0.75rem; padding:4px 8px;" href="/api/documents/${dishDoc.id}/view" target="_blank">📄 View Safety Plan PDF</a>` : '<span style="font-size:0.75rem; color:#94a3b8;">Plan Pending</span>'}
          </div>

          <!-- 3. Fire Services -->
          <div style="background:#ffffff; border:1px solid ${fireApproved ? '#bbf7d0' : '#e2e8f0'}; border-radius:6px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <b style="color:var(--navy);">🚒 Directorate of Maharashtra Fire Services</b>
              <span class="badge ${fireApproved ? 'green' : isParallelActive ? 'yellow' : 'gray'}">${fireApproved ? 'Approved' : isParallelActive ? 'In Scrutiny' : 'Queued'}</span>
            </div>
            <div style="font-size:0.72rem; color:#991b1b; font-weight:600; margin-top:2px;">Directorate of Maharashtra Fire Services</div>
            <div style="font-size:0.78rem; color:#64748b; margin:6px 0;">Static water storage (100–250 kL), 2280+ LPM pump rating & peripheral tender access for Life Safety Clearance.</div>
            ${fire.remarks ? `<div style="font-size:0.75rem; color:#15803d; background:#f0fdf4; padding:4px 8px; border-radius:4px; margin-bottom:8px;">"${fire.remarks}"</div>` : ''}
            ${fireDoc ? `<a class="btn outline sm" style="font-size:0.75rem; padding:4px 8px;" href="/api/documents/${fireDoc.id}/view" target="_blank">📄 View Fire Plan PDF</a>` : '<span style="font-size:0.75rem; color:#94a3b8;">Plan Pending</span>'}
          </div>
        </div>
      </div>

      <!-- Phase 3: Final Single-Window Clearance (Apex Authority) -->
      <div style="background:${msinsApproved ? '#f0fdf4' : '#eff6ff'}; border:1.5px solid ${msinsApproved ? '#86efac' : '#bfdbfe'}; border-radius:8px; padding:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.2rem;">🏆</span>
              <h3 style="margin:0; font-size:1.05rem; color:var(--navy);">
                Phase 3: Department Officer (State Innovation Society Apex) · Consolidated Sanction
              </h3>
              <span class="badge ${msinsApproved ? 'green' : isApexActive ? 'yellow' : 'gray'}">
                ${msinsApproved ? '★ Sanctioned & Cleared' : isApexActive ? 'Final Apex Decision Pending' : 'Awaiting Confirming Clearances'}
              </span>
            </div>
            <div style="font-size:0.75rem; color:#1e3a8a; font-weight:600; margin-top:2px;">Maharashtra State Innovation Society (Department of Industries, Government of Maharashtra)</div>
            <p style="font-size:0.82rem; color:#475569; margin:6px 0 0 0;">
              Consolidates all departmental clearances into an official Government of Maharashtra Single-Window Master Permit with digital verification QR code &amp; cryptographic hash.
            </p>
            ${msins.remarks ? `<div style="font-size:0.82rem; color:#15803d; background:#f0fdf4; padding:6px 10px; border-radius:4px; margin-top:8px;"><b>Apex Decision:</b> "${msins.remarks}"</div>` : ''}
          </div>
          <div>
            ${msinsApproved ? `
              <a class="btn emerald" href="tracker.html?id=${data.id}" target="_blank">
                🏆 Download Master Sanction License
              </a>
            ` : isApexActive ? `
              <span class="badge yellow" style="padding:6px 12px; font-size:0.8rem;">⏳ Under Apex Authority Review</span>
            ` : `
              <span class="badge gray" style="padding:6px 12px; font-size:0.8rem;">🔒 Locked Until Phase 2 Cleared</span>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

window.loadApplicantWorkflow = loadApplicantWorkflow;

