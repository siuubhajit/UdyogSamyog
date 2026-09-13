const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

async function request(pathName, options = {}, cookie = "") {
  return new Promise((resolve, reject) => {
    const url = new URL(pathName, BASE_URL);
    const headers = {
      ...(options.json !== false && options.body && typeof options.body !== "string" && !(options.body instanceof Buffer)
        ? { "Content-Type": "application/json" }
        : {}),
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
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const str = buffer.toString("utf8");
          let json = null;
          try {
            json = JSON.parse(str);
          } catch (_) {}
          const setCookie = res.headers["set-cookie"];
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: json !== null ? json : str,
            raw: buffer,
            cookie: setCookie ? setCookie[0].split(";")[0] : cookie,
          });
        });
      },
    );
    req.on("error", reject);
    if (options.body) {
      if (Buffer.isBuffer(options.body) || typeof options.body === "string") {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

function createMultipartBody(boundary, fields, files) {
  const crlf = "\r\n";
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`,
      ),
    );
  }

  for (const [key, file] of Object.entries(files)) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"; filename="${file.filename}"${crlf}Content-Type: ${file.contentType}${crlf}${crlf}`,
      ),
    );
    parts.push(file.data);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}

async function runTests() {
  console.log("🚀 Starting Full E2E Lifecycle Tests (Uploads, Queries, Decisions, Certificate)...\n");
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
    // 1. Login as Applicant
    const loginApp = await request("/api/login", {
      method: "POST",
      body: {
        email: "entrepreneur@mahindra-auto.in",
        password: "Applicant@123#",
        role: "applicant",
      },
    });
    assert("Applicant login", loginApp.status === 200);
    const applicantCookie = loginApp.cookie;

    // 2. Login as Apex Officer
    const loginApex = await request("/api/login", {
      method: "POST",
      body: {
        email: "officer@udyog.gov.in",
        password: "Officer@123#",
        role: "official",
      },
    });
    assert("Apex officer login", loginApex.status === 200);
    const apexCookie = loginApex.cookie;

    // 3. Create a fresh application for complete lifecycle
    const newApp = await request("/api/applications", {
      method: "POST",
      body: {
        industryCategory: "Light Engineering",
        landSize: 4.0,
        waterUse: 20.0,
        electricity: 200.0,
        hazardous: 0,
        location: "MIDC Butibori, Nagpur",
        district: "Nagpur",
        projectCost: 8.0,
        employmentPotential: 75,
      },
    }, applicantCookie);
    assert("Create test application", newApp.status === 200 && newApp.data.id);
    const appId = newApp.data.id;

    // 4. Upload supporting document (DPR) via multipart/form-data
    const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
    const dummyPdfContent = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
    const multipartBody = createMultipartBody(
      boundary,
      { documentType: "Detailed Project Feasibility Report (DPR)", planType: "supporting_doc" },
      { document: { filename: "DPR_Report.pdf", contentType: "application/pdf", data: dummyPdfContent } },
    );

    const uploadRes = await request(
      `/api/applications/${appId}/documents`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
        body: multipartBody,
        json: false,
      },
      applicantCookie,
    );
    assert("Upload supporting document", uploadRes.status === 200 && uploadRes.data.ok);
    const docId = uploadRes.data.id;

    // 5. Test inline view of uploaded document
    const viewDoc = await request(`/api/documents/${docId}/view`, {}, applicantCookie);
    assert("Inline view document", viewDoc.status === 200 && viewDoc.headers["content-type"] === "application/pdf");

    // 6. Test download of document
    const downloadDoc = await request(`/api/documents/${docId}`, {}, applicantCookie);
    assert("Download document", downloadDoc.status === 200);

    // 7. Officer verify document
    const verifyDoc = await request(`/api/documents/${docId}/verify`, {
      method: "PATCH",
      body: { status: "Verified", remarks: "DPR verified and endorsed." },
    }, apexCookie);
    assert("Officer verify document", verifyDoc.status === 200 && verifyDoc.data.ok);

    // 8. Officer raises a query
    const raiseQuery = await request(`/api/applications/${appId}/query`, {
      method: "POST",
      body: { message: "Please clarify water recycling percentage." },
    }, apexCookie);
    assert("Officer raise query", raiseQuery.status === 200 && raiseQuery.data.ok);

    // Verify application status is now 'Flagged'
    const appDossier = await request(`/api/applications/${appId}`, {}, applicantCookie);
    assert("Application status is Flagged after query", appDossier.data.status === "Flagged");
    const queryItem = appDossier.data.queries[0];
    assert("Query listed in dossier", queryItem && queryItem.status === "Open");

    // 9. Applicant responds to query
    const replyQuery = await request(`/api/queries/${queryItem.id}/reply`, {
      method: "POST",
      body: { reply: "75% of process effluent will be treated through tertiary RO system and recycled." },
    }, applicantCookie);
    assert("Applicant reply to query", replyQuery.status === 200 && replyQuery.data.ok);

    // Verify application status returned to 'In Progress'
    const appDossierAfter = await request(`/api/applications/${appId}`, {}, applicantCookie);
    assert("Application returned to In Progress", appDossierAfter.data.status === "In Progress");

    // 10. Complete Stage Decisions:
    // Phase 1: MPCB Approval
    const mpcbLogin = await request("/api/login", {
      method: "POST",
      body: { email: "mpcb.officer@udyog.gov.in", password: "Mpcb@123#", role: "official" },
    });
    const mpcbDec = await request(`/api/applications/${appId}/stage-decision`, {
      method: "POST",
      body: { decision: "Approved", remarks: "MPCB CTE cleared." },
    }, mpcbLogin.cookie);
    assert("Phase 1 MPCB approval", mpcbDec.status === 200 && mpcbDec.data.nextStage === "parallel_scrutiny");

    // Phase 2: MIDC
    const midcLogin = await request("/api/login", {
      method: "POST",
      body: { email: "midc.officer@udyog.gov.in", password: "Midc@123#", role: "official" },
    });
    await request(`/api/applications/${appId}/stage-decision`, {
      method: "POST",
      body: { decision: "Approved", remarks: "MIDC cleared." },
    }, midcLogin.cookie);

    // Phase 2: DISH
    const dishLogin = await request("/api/login", {
      method: "POST",
      body: { email: "dish.officer@udyog.gov.in", password: "Dish@123#", role: "official" },
    });
    await request(`/api/applications/${appId}/stage-decision`, {
      method: "POST",
      body: { decision: "Approved", remarks: "DISH cleared." },
    }, dishLogin.cookie);

    // Phase 2: Fire
    const fireLogin = await request("/api/login", {
      method: "POST",
      body: { email: "fire.officer@udyog.gov.in", password: "Fire@123#", role: "official" },
    });
    const fireDec = await request(`/api/applications/${appId}/stage-decision`, {
      method: "POST",
      body: { decision: "Approved", remarks: "Fire cleared." },
    }, fireLogin.cookie);
    assert("Phase 2 all completed -> MSInS", fireDec.data.nextStage === "msins");

    // Phase 3: MSInS Apex Approval (supporting doc already uploaded in step 4!)
    const apexDec = await request(`/api/applications/${appId}/stage-decision`, {
      method: "POST",
      body: { decision: "Approved", remarks: "Final single-window sanction granted." },
    }, apexCookie);
    assert("Phase 3 MSInS Apex Approval granted", apexDec.status === 200 && apexDec.data.status === "Approved");

    // 11. Retrieve Digital Clearance Certificate
    const cert = await request(`/api/applications/${appId}/certificate`, {}, applicantCookie);
    assert("Certificate generated successfully", cert.status === 200 && cert.data.certificateNo && cert.data.verificationHash);
    console.log(`   📜 Certificate No: ${cert.data.certificateNo}`);
    console.log(`   🔐 Digital Hash: ${cert.data.verificationHash}`);

    console.log(`\n========================================`);
    console.log(`ALL LIFECYCLE TESTS PASSED! (${passed}/${passed})`);
    console.log(`========================================`);
  } catch (e) {
    console.error("Test execution error:", e);
    process.exit(1);
  }
}

runTests();
