/* ═══════════════════════════════════════════════════════════════
   UDYOG SAMYOG · COMMON UTILITIES
   Shared across all portal pages
   ═══════════════════════════════════════════════════════════════ */

/* ─── API Helper ───────────────────────────────────────────────── */
async function api(url, options = {}) {
  const r = await fetch(url, {
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new Error(data.error || "Request failed with status " + r.status);
  return data;
}

/* ─── Auth / Session ───────────────────────────────────────────── */
async function logout() {
  await api("/api/logout", { method: "POST" });
  location = "/";
}

function getOfficerDashboardUrl(user) {
  if (!user) return "/pages/officer-dashboard.html";
  const dept = (user.deptCode || "").toLowerCase();
  if (user.isApex || dept === "msins" || dept === "industries") {
    return "/pages/officer-dashboard-msins.html";
  }
  if (dept === "midc") return "/pages/officer-dashboard-midc.html";
  if (dept === "mpcb") return "/pages/officer-dashboard-mpcb.html";
  if (dept === "fire") return "/pages/officer-dashboard-fire.html";
  if (dept === "dish") return "/pages/officer-dashboard-dish.html";
  return "/pages/officer-dashboard-msins.html";
}

async function guard(role) {
  try {
    const { user } = await api("/api/me");
    if (!user) {
      location = "/";
      return null;
    }
    if (role && user.role !== role) {
      location =
        user.role === "official"
          ? getOfficerDashboardUrl(user)
          : "/pages/applicant-dashboard.html";
      return null;
    }

    // Update dashboard links to officer's dedicated portal
    if (user.role === "official") {
      const dashUrl = getOfficerDashboardUrl(user);
      document
        .querySelectorAll(
          "a[href='officer-dashboard.html'], a[href='/pages/officer-dashboard.html'], [data-nav-dashboard]"
        )
        .forEach((a) => a.setAttribute("href", dashUrl));
    }

    // Populate user identity indicators
    document
      .querySelectorAll("[data-company]")
      .forEach((x) => (x.textContent = user.companyName || user.department || user.email));

    document
      .querySelectorAll("[data-user-name]")
      .forEach((x) => (x.textContent = user.contactPerson || user.companyName || user.email));

    document.querySelectorAll("[data-user-dept]").forEach((x) => {
      x.textContent =
        user.department ||
        (user.role === "official" ? "Govt of Maharashtra" : "Enterprise");
    });

    document.querySelectorAll("[data-user-initial]").forEach((x) => {
      const name = user.contactPerson || user.companyName || user.email || "U";
      x.textContent = name.charAt(0).toUpperCase();
    });

    return user;
  } catch (err) {
    location = "/";
    return null;
  }
}

/* ─── Feedback Message ──────────────────────────────────────────── */
function show(id, text, ok = false) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent = text;
  e.className = "msg " + (ok ? "ok" : "err");
  e.style.display = "block";
}

/* ─── Format Helpers ────────────────────────────────────────────── */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

/**
 * Universal HTML sanitiser — prevents XSS
 * @param {string|number|null|undefined} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
if (typeof window !== "undefined") window.escapeHtml = escapeHtml;

/* ─── Statutory Checklist Helpers ───────────────────────────────── */
function updateChecklistCounter(prefix, total) {
  const checkboxes = document.querySelectorAll(`.${prefix}-chk`);
  const totalCount = total || checkboxes.length || 1;
  const checked = Array.from(checkboxes).filter((cb) => cb.checked).length;
  const counterEl = document.getElementById(`${prefix}ChecklistCounter`);
  if (counterEl) {
    if (checked === totalCount) {
      counterEl.textContent = `✅ ${checked} of ${totalCount} verified (100%)`;
      counterEl.style.color = "#15803d";
      counterEl.style.fontWeight = "700";
    } else {
      counterEl.textContent = `${checked} of ${totalCount} verified`;
      counterEl.style.color = checked > 0 ? "#2563eb" : "#b45309";
      counterEl.style.fontWeight = "600";
    }
  }
  const btn = document.getElementById(`${prefix}ToggleBtn`);
  if (btn)
    btn.textContent =
      checked === totalCount && totalCount > 0 ? "Deselect All" : "Select All";
}

function toggleAllChecklist(prefix, total, btn) {
  const targetBtn = btn || document.getElementById(`${prefix}ToggleBtn`);
  const checkboxes = document.querySelectorAll(`.${prefix}-chk`);
  const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
  checkboxes.forEach((cb) => (cb.checked = !allChecked));
  if (targetBtn) targetBtn.textContent = !allChecked ? "Deselect All" : "Select All";
  updateChecklistCounter(prefix, total || checkboxes.length);
}

function resetChecklist(prefix, total) {
  const checkboxes = document.querySelectorAll(`.${prefix}-chk`);
  checkboxes.forEach((cb) => (cb.checked = false));
  const btn = document.getElementById(`${prefix}ToggleBtn`);
  if (btn) btn.textContent = "Select All";
  updateChecklistCounter(prefix, total || checkboxes.length);
}

if (typeof window !== "undefined") {
  window.updateChecklistCounter = updateChecklistCounter;
  window.toggleAllChecklist = toggleAllChecklist;
  window.resetChecklist = resetChecklist;
}

/* ═══════════════════════════════════════════════════════════════
   THEME SYSTEM — Dark / Light Mode
   Zero-FOUC: apply theme before first paint via inline <script>
   in <head> of every page. This file handles runtime toggling.
   ═══════════════════════════════════════════════════════════════ */

const THEME_KEY = "udyog_theme";

/** Get currently active theme */
function getTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

/** Set theme, persist to localStorage, and dispatch change event */
function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
  updateThemeToggleUI(theme);
  document.dispatchEvent(new CustomEvent("udyog-theme-change", { detail: { theme } }));
}

/** Toggle between light and dark */
function toggleTheme() {
  setTheme(getTheme() === "dark" ? "light" : "dark");
}

/** Update all mounted toggle button icons/labels */
function updateThemeToggleUI(theme) {
  const isDark = (theme || getTheme()) === "dark";
  document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
    const icon  = btn.querySelector(".toggle-icon");
    const label = btn.querySelector(".toggle-label");
    if (icon)  icon.textContent  = isDark ? "☀️" : "🌙";
    if (label) label.textContent = isDark ? "Light Mode" : "Dark Mode";
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    btn.setAttribute("title",      isDark ? "Switch to light mode" : "Switch to dark mode");
  });
}

/** Build and insert a theme toggle button into the given container */
function _createToggleBtn() {
  const btn = document.createElement("button");
  btn.className = "theme-toggle-btn";
  btn.type = "button";
  btn.innerHTML = `<span class="toggle-icon">🌙</span><span class="toggle-label">Dark Mode</span>`;
  btn.addEventListener("click", toggleTheme);
  return btn;
}

/** Mount theme toggle buttons into standard mount points */
function mountThemeToggleButtons() {
  const selectors = [".topbar-actions", ".hero-header", "[data-theme-toggle-mount]"];
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((container) => {
      const signOutBtn = container.querySelector(
        'button[onclick*="logout"], .btn-logout, a[href*="logout"], a[onclick*="logout"]'
      );
      let btn = container.querySelector(".theme-toggle-btn");
      if (!btn) {
        btn = _createToggleBtn();
        if (signOutBtn && signOutBtn.parentElement === container) {
          container.insertBefore(btn, signOutBtn);
        } else {
          container.appendChild(btn);
        }
      } else {
        // If theme toggle button exists in container, ensure it is positioned before the sign out button
        if (signOutBtn && signOutBtn.parentElement === container && btn.nextElementSibling !== signOutBtn) {
          container.insertBefore(btn, signOutBtn);
        }
      }
    });
  });
  updateThemeToggleUI(getTheme());
}

/** React to OS-level prefers-color-scheme changes (only if user hasn't manually set a preference) */
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    try {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? "dark" : "light");
      }
    } catch (_) {}
  });
}

/** Auto-initialise when DOM is ready */
if (typeof window !== "undefined") {
  window.getTheme  = getTheme;
  window.setTheme  = setTheme;
  window.toggleTheme = toggleTheme;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountThemeToggleButtons);
  } else {
    mountThemeToggleButtons();
  }

  // Automatically mount AI modules across all portal pages
  [
    "/js/ai-chat.js",
    "/js/ai-advisor.js",
    "/js/ai-form-assist.js",
    "/js/ai-doc-intel.js",
    "/js/ai-copilot.js",
  ].forEach((src) => {
    const s = document.createElement("script");
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  });

  /* ═══════════════════════════════════════════════════════════════
     MODAL & WINDOWING CONTROLLER
     - Body scroll locking when modals/drawers open
     - Backdrop click outside detection to close active dialogs
     - Keyboard Escape (ESC) dismiss
     - Mutation observer for dynamic programmatic modal triggers
     ═══════════════════════════════════════════════════════════════ */

  function isModalVisible(el) {
    if (!el) return false;
    if (el.classList.contains("open")) return true;
    const style = window.getComputedStyle ? window.getComputedStyle(el) : el.style;
    return style && style.display !== "none" && style.visibility !== "hidden";
  }

  function getOpenModals() {
    const list = document.querySelectorAll(
      ".modal-overlay, .modal, .advisor-modal-overlay, #ai-advisor-modal, #vcModal"
    );
    return Array.from(list).filter(isModalVisible);
  }

  function syncBodyModalLock() {
    const openModals = getOpenModals();
    if (openModals.length > 0) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }
  }

  function closeTopModal() {
    const openModals = getOpenModals();
    if (openModals.length > 0) {
      const top = openModals[openModals.length - 1];
      top.style.display = "none";
      top.classList.remove("open");
      syncBodyModalLock();
      return true;
    }
    return false;
  }

  // Global Backdrop Click
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (
      target.classList.contains("modal-overlay") ||
      target.classList.contains("modal") ||
      target.classList.contains("advisor-modal-overlay")
    ) {
      if (!target.closest(".modal-card") && !target.closest(".advisor-modal")) {
        target.style.display = "none";
        target.classList.remove("open");
        syncBodyModalLock();
      }
    }
  });

  // Global Escape (ESC) Key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      closeTopModal();
    }
  });

  // MutationObserver to track any modal opens/closes across the entire page
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      syncBodyModalLock();
    });
    const setupObserver = () => {
      if (document.body) {
        observer.observe(document.body, {
          attributes: true,
          subtree: true,
          attributeFilter: ["style", "class"],
        });
      }
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", setupObserver);
    } else {
      setupObserver();
    }
  }

  window.syncBodyModalLock = syncBodyModalLock;
  window.closeTopModal = closeTopModal;
}

