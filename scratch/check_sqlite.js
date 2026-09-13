const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "../data/udyog-samyog.db");
if (!fs.existsSync(dbPath)) {
  console.log("No SQLite db file found at", dbPath);
  process.exit(0);
}

const db = new DatabaseSync(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("Tables in SQLite db:", tables.map(t => t.name).join(", "));

tables.forEach(t => {
  if (t.name.startsWith("sqlite_")) return;
  const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c;
  console.log(`Table ${t.name}: ${count} rows`);
});

