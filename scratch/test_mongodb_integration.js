const http = require("http");

const BASE_URL = "http://localhost:3000";

async function request(path, options = {}, cookie = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    };

    const req = http.request(
      url,
      {
        method: options.method || "GET",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch (_) {}
          const setCookie = res.headers["set-cookie"];
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json || data,
            cookie: setCookie ? setCookie[0].split(";")[0] : cookie,
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting MongoDB Integration Tests for Udyog Samyog...\n");
  let passed = 0;
  let failed = 0;

  // Reset rate limits for test run
  await request("/api/test/reset-limits", { method: "POST" });

  function assert(name, condition, details = "") {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} ${details ? "- " + details : ""}`);
      failed++;
    }
  }

  try {
    // 1. Root page
    const rootRes = await request("/");
    assert("Root page loads (200 OK)", rootRes.status === 200 && typeof rootRes.data === "string");

    // 2. Login as Applicant
    const loginApp = await request("/api/login", {
      method: "POST",
      body: {
        email: "entrepreneur@mahindra-auto.in",
        password: "Applicant@123#",
        role: "applicant",
      },
    });
    assert("Applicant login success", loginApp.status === 200 && loginApp.data.ok === true);
    const applicantCookie = loginApp.cookie;

    // 3. /api/me as Applicant
    const meApp = await request("/api/me", {}, applicantCookie);
    assert("Applicant session (/api/me)", meApp.status === 200 && meApp.data.user?.email === "entrepreneur@mahindra-auto.in");

    // 4. Get applicant's applications
    const appsRes = await request("/api/applications", {}, applicantCookie);
    assert("Fetch applicant applications", appsRes.status === 200 && Array.isArray(appsRes.data) && appsRes.data.length > 0);
    const demoApp = appsRes.data.find((a) => a.application_no === "MH/UDYOG/2026/00142") || appsRes.data[appsRes.data.length - 1];
    assert("Demo application seeded properly", demoApp && demoApp.application_no === "MH/UDYOG/2026/00142");

    // 5. Get application dossier
    const dossier = await request(`/api/applications/${demoApp.id}`, {}, applicantCookie);
    assert("Fetch application dossier", dossier.status === 200 && dossier.data.application_no === demoApp.application_no);
    assert("Dossier contains seeded documents", dossier.data.documents && dossier.data.documents.length >= 4);
    assert("Dossier contains seeded queries", Array.isArray(dossier.data.queries));
    assert("Dossier contains seeded inspections", Array.isArray(dossier.data.inspections));

    // 6. Pipeline status
    const pipeline = await request(`/api/applications/${demoApp.id}/pipeline`, {}, applicantCookie);
    assert("Fetch pipeline status", pipeline.status === 200 && Array.isArray(pipeline.data.stages) && pipeline.data.stages.length === 5);

    // 7. Certificate unavailable before approval (on in-progress demoApp)
    const certBefore = await request(`/api/applications/${demoApp.id}/certificate`, {}, applicantCookie);
    assert("Certificate 400 before approval", certBefore.status === 400);

    // 8. Login as MSInS Apex Officer
    const loginApex = await request("/api/login", {
      method: "POST",
      body: {
        email: "officer@udyog.gov.in",
        password: "Officer@123#",
        role: "official",
      },
    });
    assert("Apex Officer login success", loginApex.status === 200 && loginApex.data.ok === true);
    const apexCookie = loginApex.cookie;

    // 9. Officer view all applications
    const officerApps = await request("/api/applications", {}, apexCookie);
    assert("Officer lists all applications", officerApps.status === 200 && officerApps.data.length > 0);

    // 10. Analytics Summary
    const analytics = await request("/api/analytics/summary", {}, apexCookie);
    assert("Analytics summary loads", analytics.status === 200 && analytics.data.kpis && analytics.data.kpis.totalApplications >= 1);

    // 11. Admin Enterprises List
    const adminEnt = await request("/api/admin/enterprises", {}, apexCookie);
    assert("Admin enterprise list loads", adminEnt.status === 200 && Array.isArray(adminEnt.data) && adminEnt.data.length >= 1);

    // 12. OTP dispatch and verification
    const randSuffix = Date.now().toString().slice(-6);
    const testEmail = `test.enterprise.${randSuffix}@testcorp.in`;
    const sendOtp = await request("/api/otp/send", {
      method: "POST",
      body: { email: testEmail, purpose: "registration" },
    });
    assert("OTP dispatch returns dev code", sendOtp.status === 200 && sendOtp.data.ok && sendOtp.data.devOtp);
    const otpCode = sendOtp.data.devOtp;

    const verifyOtp = await request("/api/otp/verify", {
      method: "POST",
      body: { email: testEmail, otp: otpCode, purpose: "registration" },
    });
    assert("OTP verification success", verifyOtp.status === 200 && verifyOtp.data.verified === true);

    // 13. Register new enterprise with unique GSTIN and Phone (10-digit)
    const randDigits = Math.floor(10000 + Math.random() * 90000);
    const uniquePhone = `98220${randDigits}`;
    const uniqueGstin = `27ABCDE${randDigits.toString().slice(0, 4)}F1Z5`;
    const regRes = await request("/api/register", {
      method: "POST",
      body: {
        companyName: `Shree Ganesh Agro Processing ${randSuffix} Pvt Ltd`,
        registrationNo: uniqueGstin,
        email: testEmail,
        phone: uniquePhone,
        password: "Password@123#",
        confirmPassword: "Password@123#",
        district: "Nashik",
        sector: "Agro Industries",
        contactPerson: "Rajesh S. Patil",
        otp: otpCode,
      },
    });
    assert("Enterprise registration success", regRes.status === 200 && regRes.data.ok === true);

    // 14. Login as newly registered enterprise
    const loginNew = await request("/api/login", {
      method: "POST",
      body: {
        email: testEmail,
        password: "Password@123#",
        role: "applicant",
      },
    });
    assert("Newly registered user login", loginNew.status === 200 && loginNew.data.ok === true);
    const newCookie = loginNew.cookie;

    // 15. Create new application with new user
    const createNewApp = await request("/api/applications", {
      method: "POST",
      body: {
        industryCategory: "Food Processing",
        landSize: 2.5,
        waterUse: 15.0,
        electricity: 120.0,
        hazardous: 0,
        location: "MIDC Dindori, Nashik",
        district: "Nashik",
        projectCost: 6.5,
        employmentPotential: 45,
      },
    }, newCookie);
    assert("Create new application", createNewApp.status === 200 && createNewApp.data.ok && createNewApp.data.applicationNo);
    const newAppId = createNewApp.data.id;

    // 16. Test 3-Phase Pipeline Decisions on new application:
    // Phase 1: MPCB Approval
    const mpcbLogin = await request("/api/login", {
      method: "POST",
      body: {
        email: "mpcb.officer@udyog.gov.in",
        password: "Mpcb@123#",
        role: "official",
      },
    });
    const mpcbCookie = mpcbLogin.cookie;

    const mpcbDec = await request(`/api/applications/${newAppId}/stage-decision`, {
      method: "POST",
      body: {
        decision: "Approved",
        remarks: "Consent to Establish granted by MPCB for Agro unit.",
      },
    }, mpcbCookie);
    assert("Phase 1 MPCB approval", mpcbDec.status === 200 && mpcbDec.data.nextStage === "parallel_scrutiny");

    // Phase 2: MIDC Approval
    const midcLogin = await request("/api/login", {
      method: "POST",
      body: {
        email: "midc.officer@udyog.gov.in",
        password: "Midc@123#",
        role: "official",
      },
    });
    const midcCookie = midcLogin.cookie;

    const midcDec = await request(`/api/applications/${newAppId}/stage-decision`, {
      method: "POST",
      body: {
        decision: "Approved",
        remarks: "MIDC Plot layout and drainage lines approved.",
      },
    }, midcCookie);
    assert("Phase 2 MIDC approval", midcDec.status === 200);

    // Phase 2: DISH Approval
    const dishLogin = await request("/api/login", {
      method: "POST",
      body: {
        email: "dish.officer@udyog.gov.in",
        password: "Dish@123#",
        role: "official",
      },
    });
    const dishCookie = dishLogin.cookie;

    const dishDec = await request(`/api/applications/${newAppId}/stage-decision`, {
      method: "POST",
      body: {
        decision: "Approved",
        remarks: "DISH Factory safety and ventilation approved.",
      },
    }, dishCookie);
    assert("Phase 2 DISH approval", dishDec.status === 200);

    // Phase 2: Fire Approval -> Should complete Phase 2 and advance to msins!
    const fireLogin = await request("/api/login", {
      method: "POST",
      body: {
        email: "fire.officer@udyog.gov.in",
        password: "Fire@123#",
        role: "official",
      },
    });
    const fireCookie = fireLogin.cookie;

    const fireDec = await request(`/api/applications/${newAppId}/stage-decision`, {
      method: "POST",
      body: {
        decision: "Approved",
        remarks: "Fire hydrant pressure and fire exits validated.",
      },
    }, fireCookie);
    assert("Phase 2 Fire approval -> Advances to MSInS Apex", fireDec.status === 200 && fireDec.data.nextStage === "msins");

    // Phase 3: Try MSInS approval without supporting doc -> Should fail with prerequisite error
    const msinsDecFail = await request(`/api/applications/${newAppId}/stage-decision`, {
      method: "POST",
      body: {
        decision: "Approved",
        remarks: "Final single window clearance.",
      },
    }, apexCookie);
    assert("Phase 3 requires supporting doc prerequisite", msinsDecFail.status === 400);

    // 17. Schemes eligible endpoint
    const schemes = await request("/api/schemes/eligible?landSize=2&waterUse=10&electricity=50&projectCost=5");
    assert("Eligible schemes endpoint", schemes.status === 200 && Array.isArray(schemes.data.schemes));

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);

    if (failed > 0) process.exit(1);
  } catch (e) {
    console.error("Test execution error:", e);
    process.exit(1);
  }
}

runTests();
