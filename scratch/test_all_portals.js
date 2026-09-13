const http = require("http");

async function req(path, method, body, cookie) {
  return new Promise((resolve) => {
    const r = http.request("http://localhost:3000" + path, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(d); } catch (_) {}
        resolve({
          status: res.statusCode,
          data: json || d,
          cookie: res.headers["set-cookie"]?.[0]?.split(";")[0],
        });
      });
    });
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

(async () => {
  console.log("Testing all 6 portal logins...\n");
  await req("/api/test/reset-limits", "POST");

  const accounts = [
    { email: "officer@udyog.gov.in", pass: "Officer@123#", role: "official", name: "MSInS Apex Officer" },
    { email: "midc.officer@udyog.gov.in", pass: "Midc@123#", role: "official", name: "MIDC Officer" },
    { email: "mpcb.officer@udyog.gov.in", pass: "Mpcb@123#", role: "official", name: "MPCB Officer" },
    { email: "fire.officer@udyog.gov.in", pass: "Fire@123#", role: "official", name: "Fire Officer" },
    { email: "dish.officer@udyog.gov.in", pass: "Dish@123#", role: "official", name: "DISH Officer" },
    { email: "entrepreneur@mahindra-auto.in", pass: "Applicant@123#", role: "applicant", name: "Enterprise Applicant" },
  ];

  for (const acc of accounts) {
    const login = await req("/api/login", "POST", { email: acc.email, password: acc.pass, role: acc.role });
    if (login.status === 200 && login.data.ok) {
      console.log(`✅ [${acc.name}] Login OK: ${acc.email} (${login.data.user.department})`);
      const apps = await req("/api/applications", "GET", null, login.cookie);
      console.log(`   -> Applications visible in dashboard: ${Array.isArray(apps.data) ? apps.data.length : 'error'}`);
    } else {
      console.error(`❌ [${acc.name}] Login FAILED:`, login.status, login.data);
      process.exit(1);
    }
  }

  console.log("\n🎉 All 6 portals validated successfully against MongoDB!");
})();

