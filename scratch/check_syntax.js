const fs = require("fs");
const path = require("path");

const filesToCheck = [
  "db/models.js",
  "db/seed.js",
  "utils/helpers.js",
  "routes/auth.js",
  "routes/admin.js",
  "routes/applications.js",
  "routes/documents.js",
  "routes/queries.js",
  "routes/inspections.js",
  "routes/analytics.js",
  "server.js",
];

let allOk = true;
for (const file of filesToCheck) {
  try {
    require(path.join(__dirname, "..", file));
    console.log(`✅ ${file}: syntax & load OK`);
  } catch (err) {
    console.error(`❌ ${file}: ERROR:`, err.message);
    allOk = false;
  }
}

if (allOk) {
  console.log("\n🎉 ALL 11 FILES PASSED SYNTAX AND LOAD CHECKS!");
} else {
  process.exit(1);
}

