/**
 * Shared Decision Panel & Submission Logic for Departmental Officers
 * Standardized across MPCB, MIDC, DISH, and FIRE
 */

let activeDecisionAppId = null;
let activeDecisionDept = null;
let activeDecisionAppNo = null;
let activeDecisionCompany = null;

function openDepartmentDecisionModal({
  applicationId,
  department,
  applicationNo,
  companyName,
  deptConfig,
}) {
  activeDecisionAppId = applicationId;
  activeDecisionDept = department;
  activeDecisionAppNo = applicationNo;
  activeDecisionCompany = companyName;

  const modal = document.getElementById("departmentDecisionModal");
  if (!modal) return;

  const titleEl = document.getElementById("decisionModalTitle");
  if (titleEl) {
    titleEl.textContent = `Statutory Action: ${deptConfig.name}`;
  }

  const subEl = document.getElementById("decisionModalSubtitle");
  if (subEl) {
    subEl.textContent = `${applicationNo} · ${companyName} (${deptConfig.phase})`;
  }

  const checklistContainer = document.getElementById(
    "decisionChecklistContainer",
  );
  if (checklistContainer) {
    checklistContainer.innerHTML = (deptConfig.checklist || [])
      .map(
        (item, idx) => `
      <label class="checklist-item statutory-chk-card" for="deptChk_${idx}">
        <div style="display:flex;align-items:center;gap:10px;flex:1;">
          <input type="checkbox" class="dept-decision-chk" id="deptChk_${idx}" style="cursor:pointer;" />
          <span class="chk-item-title" style="font-size:0.85rem;line-height:1.4;color:var(--color-text-primary, var(--ink));font-weight:500;">${escapeHtml(item)}</span>
        </div>
        <div class="chk-tick-badge unticked" id="badge_deptChk_${idx}" title="Click to toggle statutory verification">
          <span class="tick-icon">○</span>
          <span class="status-text">Unticked</span>
        </div>
      </label>
    `,
      )
      .join("");
  }

  const counterEl = document.getElementById("decisionChecklistCounter");
  if (counterEl) {
    counterEl.textContent = `0 of ${(deptConfig.checklist || []).length} verified`;
  }

  const remarksInput = document.getElementById("decisionRemarksInput");
  if (remarksInput) {
    remarksInput.value = "";
    remarksInput.placeholder = `Provide specific observations, statutory conditions, or query requirements...`;
  }

  const updateDecisionChecklistUI = () => {
    const chks = modal.querySelectorAll(".dept-decision-chk");
    const checked = Array.from(chks).filter((c) => c.checked).length;
    chks.forEach((cb) => {
      const badge = document.getElementById(`badge_${cb.id}`) || cb.closest(".checklist-item")?.querySelector(".chk-tick-badge");
      const card = cb.closest(".checklist-item");
      if (badge) {
        if (cb.checked) {
          badge.className = "chk-tick-badge ticked";
          badge.innerHTML = `<span class="tick-icon">✓</span> <span class="status-text">Ticked</span>`;
          if (card) {
            card.classList.add("ticked");
            card.style.borderColor = "#16a34a";
            card.style.background = "rgba(22, 163, 74, 0.08)";
          }
        } else {
          badge.className = "chk-tick-badge unticked";
          badge.innerHTML = `<span class="tick-icon">○</span> <span class="status-text">Unticked</span>`;
          if (card) {
            card.classList.remove("ticked");
            card.style.borderColor = "var(--color-border, #e2e8f0)";
            card.style.background = "var(--color-surface-card, #ffffff)";
          }
        }
      }
    });

    if (counterEl) {
      counterEl.textContent =
        checked === chks.length
          ? `✅ All ${checked} statutory criteria verified (100%)`
          : `${checked} of ${chks.length} verified`;
      counterEl.style.color =
        checked === chks.length
          ? "var(--color-success, var(--ok-ink))"
          : "var(--color-warning, var(--warn-ink))";
    }

    const toggleBtn = document.getElementById("decisionToggleAllBtn");
    if (toggleBtn) {
      toggleBtn.textContent =
        checked === chks.length && chks.length > 0 ? "Deselect All" : "Select All";
    }
  };

  // Bind checkbox counter and badge updates
  const chks = modal.querySelectorAll(".dept-decision-chk");
  chks.forEach((cb) => {
    cb.addEventListener("change", updateDecisionChecklistUI);
  });

  if (window.Modal) {
    Modal.open("departmentDecisionModal");
  } else {
    modal.style.display = "flex";
  }
}

function toggleAllDecisionChecklist() {
  const chks = document.querySelectorAll(".dept-decision-chk");
  const allChecked = Array.from(chks).every((c) => c.checked);
  chks.forEach((c) => {
    c.checked = !allChecked;
    const badge = document.getElementById(`badge_${c.id}`) || c.closest(".checklist-item")?.querySelector(".chk-tick-badge");
    const card = c.closest(".checklist-item");
    if (badge) {
      if (c.checked) {
        badge.className = "chk-tick-badge ticked";
        badge.innerHTML = `<span class="tick-icon">✓</span> <span class="status-text">Ticked</span>`;
        if (card) {
          card.classList.add("ticked");
          card.style.borderColor = "#16a34a";
          card.style.background = "rgba(22, 163, 74, 0.08)";
        }
      } else {
        badge.className = "chk-tick-badge unticked";
        badge.innerHTML = `<span class="tick-icon">○</span> <span class="status-text">Unticked</span>`;
        if (card) {
          card.classList.remove("ticked");
          card.style.borderColor = "var(--color-border, #e2e8f0)";
          card.style.background = "var(--color-surface-card, #ffffff)";
        }
      }
    }
  });

  const counterEl = document.getElementById("decisionChecklistCounter");
  if (counterEl) {
    const checked = !allChecked ? chks.length : 0;
    counterEl.textContent =
      checked === chks.length
        ? `✅ All ${checked} statutory criteria verified (100%)`
        : `${checked} of ${chks.length} verified`;
    counterEl.style.color =
      checked === chks.length
        ? "var(--color-success, var(--ok-ink))"
        : "var(--color-warning, var(--warn-ink))";
  }
  const btn = document.getElementById("decisionToggleAllBtn");
  if (btn) btn.textContent = !allChecked ? "Deselect All" : "Select All";
}

async function submitDepartmentDecision({
  applicationId = activeDecisionAppId,
  department = activeDecisionDept,
  decision,
  remarks,
  checklistSelector = ".dept-decision-chk",
  defaultApprovalRemark = "Statutory departmental clearance granted.",
  onSuccess,
}) {
  if (!applicationId) return;

  const rawRemarks =
    remarks !== undefined
      ? remarks
      : (document.getElementById("decisionRemarksInput")?.value || "").trim();

  // Verification checklist check on approval
  if (decision === "Approved") {
    const items = Array.from(document.querySelectorAll(checklistSelector));
    const incomplete = items.some((item) => !item.checked);
    if (items.length > 0 && incomplete) {
      if (typeof notify === "function") {
        notify(
          `Statutory Requirement: Please verify and check all ${items.length} checklist items before issuing clearance.`,
          "warning",
        );
      } else {
        alert("Please complete all checklist items before approval.");
      }
      return;
    }
  }

  // Remarks validation for Query and Reject
  if (decision === "Query" && !rawRemarks) {
    if (typeof notify === "function") {
      notify(
        "Please provide the specific clarification query or missing document requirements for the applicant.",
        "warning",
      );
    } else {
      alert("Please provide the query remarks.");
    }
    return;
  }

  if (decision === "Rejected" && !rawRemarks) {
    if (typeof notify === "function") {
      notify(
        "Please provide statutory grounds and reference acts for clearance refusal.",
        "warning",
      );
    } else {
      alert("Please provide statutory grounds for rejection.");
    }
    return;
  }

  try {
    const res = await api(`/api/applications/${applicationId}/stage-decision`, {
      method: "POST",
      body: JSON.stringify({
        decision,
        targetDept: department,
        remarks: rawRemarks || defaultApprovalRemark,
      }),
    });

    if (typeof notify === "function") {
      notify(
        res.message || `Decision '${decision}' recorded successfully.`,
        "success",
      );
    }

    if (window.Modal) {
      Modal.close("departmentDecisionModal");
    } else {
      const m = document.getElementById("departmentDecisionModal");
      if (m) m.style.display = "none";
    }

    if (typeof onSuccess === "function") {
      onSuccess(res);
    } else if (typeof window.reloadWorkspaceApplications === "function") {
      window.reloadWorkspaceApplications();
    }
  } catch (err) {
    if (typeof notify === "function") {
      notify(`Submission failed: ${err.message}`, "error");
    } else {
      alert("Action failed: " + err.message);
    }
  }
}

if (typeof window !== "undefined") {
  window.openDepartmentDecisionModal = openDepartmentDecisionModal;
  window.toggleAllDecisionChecklist = toggleAllDecisionChecklist;
  window.submitDepartmentDecision = submitDepartmentDecision;
}
