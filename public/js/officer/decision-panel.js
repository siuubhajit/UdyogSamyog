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
      <label class="checklist-item-row" style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;cursor:pointer;user-select:none;">
        <input type="checkbox" class="dept-decision-chk" id="deptChk_${idx}" style="width:17px;height:17px;margin-top:2px;accent-color:${deptConfig.accentColor || "var(--navy)"};" />
        <span style="font-size:0.85rem;line-height:1.4;color:var(--color-text-primary, var(--ink));">${escapeHtml(item)}</span>
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

  // Bind checkbox counter
  const chks = modal.querySelectorAll(".dept-decision-chk");
  chks.forEach((cb) => {
    cb.addEventListener("change", () => {
      const checked = Array.from(chks).filter((c) => c.checked).length;
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
    });
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
  chks.forEach((c) => (c.checked = !allChecked));
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
