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

    // Update any dashboard links in topbar or sidebar to point to this officer's dedicated dashboard
    if (user.role === "official") {
      const dashUrl = getOfficerDashboardUrl(user);
      document.querySelectorAll("a[href='officer-dashboard.html'], a[href='/pages/officer-dashboard.html'], [data-nav-dashboard]").forEach((a) => {
        a.setAttribute("href", dashUrl);
      });
    }

    // Populate user indicators
    document.querySelectorAll("[data-company]").forEach((x) => {
      x.textContent = user.companyName || user.department || user.email;
    });

    document.querySelectorAll("[data-user-name]").forEach((x) => {
      x.textContent = user.contactPerson || user.companyName || user.email;
    });

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

function show(id, text, ok = false) {
  const e = document.getElementById(id);
  if (!e) return;
  e.textContent = text;
  e.className = "msg " + (ok ? "ok" : "err");
  e.style.display = "block";
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
