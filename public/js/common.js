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

    updateSidebarUser(user);

    return user;
  } catch (err) {
    location = "/";
    return null;
  }
}

/* ─── Sidebar User Profile Synchronizer ─────────────────────────── */
function updateSidebarUser(user) {
  if (!user) {
    try {
      const cached = sessionStorage.getItem("cached_user");
      if (cached) user = JSON.parse(cached);
    } catch (_) {}
  } else {
    try {
      sessionStorage.setItem("cached_user", JSON.stringify(user));
    } catch (_) {}
  }

  const rawName = (user && (user.contactPerson || user.companyName || user.name || user.email)) || "Subhajit Majee";
  const name = String(rawName).toUpperCase();
  const email = (user && user.email) || "siuubhajit@gmail.com";
  const dept =
    (user && (user.department || (user.role === "official" ? "Govt of Maharashtra" : user.companyName))) ||
    "B. P. Poddar Institute of Management & Tech";
  const initial = rawName.charAt(0).toUpperCase() || "S";

  document.querySelectorAll("[data-sidebar-name]").forEach((el) => {
    el.textContent = name;
  });
  document.querySelectorAll("[data-sidebar-email]").forEach((el) => {
    el.textContent = email;
  });
  document.querySelectorAll("[data-sidebar-dept]").forEach((el) => {
    el.textContent = dept;
  });
  document.querySelectorAll("[data-sidebar-initial]").forEach((el) => {
    el.textContent = initial;
  });
}
if (typeof window !== "undefined") {
  window.updateSidebarUser = updateSidebarUser;
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

  let isSyncing = false;
  function syncBodyModalLock() {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const openModals = getOpenModals();
      const shouldLock = openModals.length > 0;
      const isLocked = document.body ? document.body.classList.contains("modal-open") : false;
      if (shouldLock && !isLocked) {
        document.body.classList.add("modal-open");
      } else if (!shouldLock && isLocked) {
        document.body.classList.remove("modal-open");
      }
    } finally {
      isSyncing = false;
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

  // Safe MutationObserver: only watches modal containers, completely ignores document.body to prevent infinite loops
  if (typeof MutationObserver !== "undefined") {
    let mutDebounce = null;
    const observer = new MutationObserver((mutations) => {
      const hasModalChange = mutations.some((m) => {
        if (!m.target || m.target === document.body) return false;
        return (
          m.target.matches &&
          m.target.matches(
            ".modal-overlay, .modal, .advisor-modal-overlay, #ai-advisor-modal, #vcModal, .modal-card"
          )
        );
      });
      if (hasModalChange) {
        clearTimeout(mutDebounce);
        mutDebounce = setTimeout(syncBodyModalLock, 50);
      }
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

/* ═══════════════════════════════════════════════════════════════
   TOAST NOTIFICATION SYSTEM (notify)
   ═══════════════════════════════════════════════════════════════ */
function notify(message, type = "info", duration = 4000) {
  let container = document.getElementById("udyog-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "udyog-toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  const titles = {
    success: "Success",
    error: "Error",
    warning: "Attention Required",
    info: "Notice",
  };

  const toast = document.createElement("div");
  toast.className = `udyog-toast udyog-toast--${type}`;
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  toast.innerHTML = `
    <div class="udyog-toast-icon">${icons[type] || icons.info}</div>
    <div class="udyog-toast-content">
      <div class="udyog-toast-title">${titles[type] || "Notice"}</div>
      <div class="udyog-toast-msg">${escapeHtml(message)}</div>
    </div>
    <button type="button" class="udyog-toast-close" aria-label="Dismiss notification">&times;</button>
  `;

  let dismissed = false;
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 280);
  }

  toast.querySelector(".udyog-toast-close").addEventListener("click", dismiss);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  container.appendChild(toast);
  return { dismiss };
}

/* ═══════════════════════════════════════════════════════════════
   CONFIRM DIALOG MODAL (confirmDialog)
   Returns Promise<boolean>
   ═══════════════════════════════════════════════════════════════ */
function confirmDialog(options = {}) {
  return new Promise((resolve) => {
    const {
      title = "Confirm Action",
      body = "Are you sure you want to proceed with this action?",
      confirmText = "Confirm",
      cancelText = "Cancel",
      danger = false,
      icon = danger ? "⚠️" : "❓",
    } = typeof options === "string" ? { body: options } : options;

    const overlay = document.createElement("div");
    overlay.className = "udyog-dialog-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");

    overlay.innerHTML = `
      <div class="udyog-dialog-card">
        <div class="udyog-dialog-header">
          <div class="udyog-dialog-icon">${icon}</div>
          <h3 class="udyog-dialog-title">${escapeHtml(title)}</h3>
        </div>
        <div class="udyog-dialog-body">${escapeHtml(body)}</div>
        <div class="udyog-dialog-actions">
          <button type="button" class="btn outline sm btn-dialog-cancel">${escapeHtml(cancelText)}</button>
          <button type="button" class="btn ${danger ? "danger" : "primary"} sm btn-dialog-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    function close(result) {
      overlay.style.opacity = "0";
      overlay.style.transition = "opacity 0.15s ease";
      setTimeout(() => {
        if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
        if (window.syncBodyModalLock) window.syncBodyModalLock();
      }, 150);
      resolve(result);
    }

    overlay.querySelector(".btn-dialog-cancel").addEventListener("click", () => close(false));
    overlay.querySelector(".btn-dialog-confirm").addEventListener("click", () => close(true));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });

    const keyHandler = (e) => {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", keyHandler);
        close(false);
      } else if (e.key === "Enter") {
        document.removeEventListener("keydown", keyHandler);
        close(true);
      }
    };
    document.addEventListener("keydown", keyHandler);

    document.body.appendChild(overlay);
    if (window.syncBodyModalLock) window.syncBodyModalLock();

    const confirmBtn = overlay.querySelector(".btn-dialog-confirm");
    if (confirmBtn) confirmBtn.focus();
  });
}

/* ═══════════════════════════════════════════════════════════════
   SIDEBAR & DRAWER CONTROLLER
   - Desktop rail toggle (68px icon rail vs 260px expanded)
   - Mobile hamburger drawer toggle & backdrop
   ═══════════════════════════════════════════════════════════════ */
function initSidebarController() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // 1. Desktop Rail Collapse State Restoration
  let isCollapsed = false;
  try {
    isCollapsed = localStorage.getItem("sidebar_collapsed") === "true";
  } catch (_) {}

  if (isCollapsed) {
    document.body.classList.add("sidebar-collapsed");
  } else {
    document.body.classList.remove("sidebar-collapsed");
  }

  // Exact reference icons for squircle toggle
  const ICON_COLLAPSE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="15 9 12 12 15 15"></polyline></svg>`;
  const ICON_EXPAND = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"></rect><line x1="9" y1="3" x2="9" y2="21"></line><polyline points="13 9 16 12 13 15"></polyline></svg>`;

  // 2. Mount Top Section if missing
  let topSection = sidebar.querySelector(".sidebar-top-section");
  if (!topSection) {
    topSection = document.createElement("div");
    topSection.className = "sidebar-top-section";

    topSection.innerHTML = `
      <div class="sidebar-header-row">
        <a href="/" class="sidebar-brand">
          <span class="sidebar-brand-emblem">🏛️</span>
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-title">उद्योग संयोग</span>
            <span class="sidebar-brand-tag">Govt. of Maharashtra</span>
          </div>
        </a>
        <button type="button" class="sidebar-rail-toggle" aria-label="Toggle sidebar rail" title="Collapse/Expand Sidebar Rail">
          ${isCollapsed ? ICON_EXPAND : ICON_COLLAPSE}
        </button>
      </div>

      <div class="sidebar-user-card">
        <div class="sidebar-user-status">
          <span class="sidebar-online-dot"></span>
          <span>WELCOME: <span data-sidebar-name>SUBHAJIT MAJEE</span></span>
        </div>
        <div class="sidebar-user-email" data-sidebar-email>siuubhajit@gmail.com</div>
        <div class="sidebar-user-dept" data-sidebar-dept>B. P. Poddar Institute of Management &amp; Tech</div>
      </div>

      <div class="sidebar-avatar-circle" title="User Profile">
        <img src="/img/user-avatar.png" alt="Profile" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';" />
        <div class="sidebar-avatar-fallback" style="display:none;" data-sidebar-initial>S</div>
      </div>

      <hr class="sidebar-divider" />
    `;

    sidebar.insertBefore(topSection, sidebar.firstChild);
  }

  // Populate user data into [data-sidebar-*]
  updateSidebarUser();

  // Attach toggle click handler
  const railToggle = topSection.querySelector(".sidebar-rail-toggle");
  if (railToggle && !railToggle.dataset.bound) {
    railToggle.dataset.bound = "true";
    railToggle.addEventListener("click", () => {
      const nowCollapsed = document.body.classList.toggle("sidebar-collapsed");
      railToggle.innerHTML = nowCollapsed ? ICON_EXPAND : ICON_COLLAPSE;
      try {
        localStorage.setItem("sidebar_collapsed", nowCollapsed ? "true" : "false");
      } catch (_) {}
    });
  }

  // 3. Process links in sidebar: wrap labels, add tooltips, upgrade icons to crisp SVGs
  sidebar.querySelectorAll("a:not(.sidebar-brand):not(.sidebar-main-btn)").forEach((link) => {
    let label = link.querySelector(".sidebar-label");
    let tooltip = link.querySelector(".sidebar-tooltip");

    if (!label) {
      const childNodes = Array.from(link.childNodes);
      const textNodes = childNodes.filter(
        (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0
      );
      let text = "";
      if (textNodes.length > 0) {
        text = textNodes.map((n) => n.textContent).join(" ").trim();
        textNodes.forEach((n) => n.remove());
      } else {
        const nonIcons = childNodes.filter(
          (n) =>
            n.nodeType === Node.ELEMENT_NODE &&
            !n.classList.contains("sidebar-icon") &&
            !n.classList.contains("sidebar-badge") &&
            !n.classList.contains("badge")
        );
        if (nonIcons.length > 0) {
          text = nonIcons.map((n) => n.textContent).join(" ").trim();
          nonIcons.forEach((n) => n.remove());
        }
      }

      if (text) {
        label = document.createElement("span");
        label.className = "sidebar-label";
        label.textContent = text;
        const badge = link.querySelector(".sidebar-badge, .badge");
        if (badge && badge.parentElement === link) {
          link.insertBefore(label, badge);
        } else {
          link.appendChild(label);
        }
      }
    }

    const linkText = (label ? label.textContent : link.textContent).trim();

    if (!tooltip && linkText) {
      tooltip = document.createElement("span");
      tooltip.className = "sidebar-tooltip";
      tooltip.textContent = linkText;
      link.appendChild(tooltip);
    }

    // Enhance icons with crisp SVGs matching the reference screenshots
    const iconSpan = link.querySelector(".sidebar-icon");
    if (iconSpan && !iconSpan.querySelector("svg")) {
      const txtLower = linkText.toLowerCase();

      if (txtLower.includes("dashboard") || txtLower.includes("overview")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
      } else if (txtLower.includes("profile") || txtLower.includes("account") || txtLower.includes("user")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
      } else if (txtLower.includes("assessment") || txtLower.includes("test")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><polyline points="9 15 11 17 15 13"></polyline></svg>`;
      } else if (txtLower.includes("queue") || txtLower.includes("application") || txtLower.includes("permit")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`;
      } else if (txtLower.includes("saved") || txtLower.includes("bookmark")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`;
      } else if (txtLower.includes("private") || txtLower.includes("enterprise") || txtLower.includes("registry") || txtLower.includes("company")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="9" y1="6" x2="9" y2="6.01"></line><line x1="15" y1="6" x2="15" y2="6.01"></line><line x1="9" y1="10" x2="9" y2="10.01"></line><line x1="15" y1="10" x2="15" y2="10.01"></line><line x1="9" y1="14" x2="9" y2="14.01"></line><line x1="15" y1="14" x2="15" y2="14.01"></line><line x1="9" y1="18" x2="9" y2="18.01"></line><line x1="15" y1="18" x2="15" y2="18.01"></line></svg>`;
      } else if (txtLower.includes("government") || txtLower.includes("apex") || txtLower.includes("deemed") || txtLower.includes("sla")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V10"></path><path d="M19 21V10"></path><path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7"></path><polygon points="12 2 2 7 22 7"></polygon></svg>`;
      } else if (txtLower.includes("army") || txtLower.includes("security") || txtLower.includes("safety") || txtLower.includes("fire") || txtLower.includes("dish")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
      } else if (txtLower.includes("nhai") || txtLower.includes("truck") || txtLower.includes("transport") || txtLower.includes("logistics")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
      } else if (txtLower.includes("amrutam") || txtLower.includes("water") || txtLower.includes("mpcb") || txtLower.includes("pollution")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path></svg>`;
      } else if (txtLower.includes("scheme") || txtLower.includes("psi") || txtLower.includes("incentive") || txtLower.includes("fund") || txtLower.includes("calculator")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
      } else if (txtLower.includes("scrutiny") || txtLower.includes("vault") || txtLower.includes("dossier") || txtLower.includes("verification") || txtLower.includes("search")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
      } else if (txtLower.includes("analytics") || txtLower.includes("intelligence") || txtLower.includes("report") || txtLower.includes("metric")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
      } else if (txtLower.includes("ai") || txtLower.includes("operations") || txtLower.includes("admin") || txtLower.includes("copilot")) {
        iconSpan.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
      }
    }
  });

  // 4. Mount Bottom Section ("Go to Main Page")
  let bottomSection = sidebar.querySelector(".sidebar-bottom-section");
  if (!bottomSection) {
    bottomSection = document.createElement("div");
    bottomSection.className = "sidebar-bottom-section";
    bottomSection.innerHTML = `
      <hr class="sidebar-divider" />
      <a href="/" class="sidebar-main-btn" aria-label="Go to Main Page">
        <span class="sidebar-globe-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        </span>
        <span class="sidebar-main-btn-label">Go to Main Page</span>
        <span class="sidebar-tooltip">Go to Main Page</span>
      </a>
    `;
    sidebar.appendChild(bottomSection);
  }

  // 5. Mobile Hamburger Button in Topbar
  const topbarBrand = document.querySelector(".topbar .brand-group");
  if (topbarBrand && !document.querySelector(".mobile-nav-toggle")) {
    const navBtn = document.createElement("button");
    navBtn.className = "mobile-nav-toggle";
    navBtn.type = "button";
    navBtn.setAttribute("aria-label", "Open navigation drawer");
    navBtn.setAttribute("title", "Toggle navigation");
    navBtn.innerHTML = "☰";
    topbarBrand.insertBefore(navBtn, topbarBrand.firstChild);

    // Backdrop for mobile drawer
    let backdrop = document.querySelector(".sidebar-backdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "sidebar-backdrop";
      document.body.appendChild(backdrop);
    }

    function toggleMobileDrawer(open) {
      const isOpen = open !== undefined ? open : !sidebar.classList.contains("drawer-open");
      if (isOpen) {
        sidebar.classList.add("drawer-open");
        backdrop.classList.add("active");
        document.body.classList.add("modal-open");
      } else {
        sidebar.classList.remove("drawer-open");
        backdrop.classList.remove("active");
        document.body.classList.remove("modal-open");
      }
    }

    navBtn.addEventListener("click", () => toggleMobileDrawer());
    backdrop.addEventListener("click", () => toggleMobileDrawer(false));

    sidebar.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          toggleMobileDrawer(false);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if ((e.key === "Escape" || e.key === "Esc") && sidebar.classList.contains("drawer-open")) {
        toggleMobileDrawer(false);
      }
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   SORTABLE TABLES HELPER
   Automatically enables column sorting on tables with [data-sortable]
   ═══════════════════════════════════════════════════════════════ */
function setupSortableTables() {
  const tables = document.querySelectorAll(
    "table[data-sortable], table.sortable, .table-container table:not([data-no-sort]), .table-wrap table:not([data-no-sort])"
  );
  tables.forEach((table) => {
    const ths = table.querySelectorAll("thead th");
    ths.forEach((th, colIdx) => {
      if (th.getAttribute("data-no-sort") !== null) return;
      const text = th.textContent.trim().toLowerCase();
      if (text === "action" || text === "actions" || text === "view" || text === "") return;
      if (th.classList.contains("sortable-th")) return;

      th.classList.add("sortable-th");
      if (!th.querySelector(".sort-icon")) {
        const icon = document.createElement("span");
        icon.className = "sort-icon";
        icon.innerHTML = "↕";
        th.appendChild(icon);
      }
      th.setAttribute("aria-sort", "none");

      th.addEventListener("click", () => {
        const currentOrder = th.getAttribute("aria-sort");
        const newOrder = currentOrder === "ascending" ? "descending" : "ascending";

        ths.forEach((otherTh) => {
          otherTh.setAttribute("aria-sort", "none");
          const otherIcon = otherTh.querySelector(".sort-icon");
          if (otherIcon) otherIcon.innerHTML = "↕";
        });

        th.setAttribute("aria-sort", newOrder);
        const icon = th.querySelector(".sort-icon");
        if (icon) icon.innerHTML = newOrder === "ascending" ? "↑" : "↓";

        const tbody = table.querySelector("tbody");
        if (!tbody) return;

        // Only sort actual data rows (skip colspan rows like loaders/empty states)
        const allRows = Array.from(tbody.querySelectorAll("tr"));
        const dataRows = allRows.filter((r) => !r.querySelector("td[colspan]"));
        if (dataRows.length <= 1) return;

        dataRows.sort((rowA, rowB) => {
          const cellA = rowA.children[colIdx] ? rowA.children[colIdx].textContent.trim() : "";
          const cellB = rowB.children[colIdx] ? rowB.children[colIdx].textContent.trim() : "";

          const numA = parseFloat(cellA.replace(/[^0-9.-]/g, ""));
          const numB = parseFloat(cellB.replace(/[^0-9.-]/g, ""));

          let cmp = 0;
          if (!isNaN(numA) && !isNaN(numB) && cellA.match(/^[₹$€\d]/)) {
            cmp = numA - numB;
          } else {
            cmp = cellA.localeCompare(cellB, undefined, { numeric: true, sensitivity: "base" });
          }
          return newOrder === "ascending" ? cmp : -cmp;
        });

        dataRows.forEach((r) => tbody.appendChild(r));
      });
    });
  });
}

if (typeof window !== "undefined") {
  window.notify = notify;
  window.confirmDialog = confirmDialog;
  window.setupSortableTables = setupSortableTables;
  window.initSidebarController = initSidebarController;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSidebarController();
      setupSortableTables();
    });
  } else {
    initSidebarController();
    setupSortableTables();
  }
}


