/**
 * Seed script: Import Excel budget data into SQLite
 * Usage: npx tsx scripts/seed.ts <path-to-excel>
 */
import Database from "better-sqlite3";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

const excelPath = process.argv[2];
if (!excelPath) {
  console.error("Usage: npx tsx scripts/seed.ts <path-to-excel>");
  process.exit(1);
}

const DB_PATH = path.join(process.cwd(), "data", "budget.db");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS budget_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id INTEGER,
    act_code_id INTEGER,
    active_id INTEGER,
    fund TEXT NOT NULL,
    activity_detail TEXT NOT NULL,
    prog TEXT NOT NULL,
    center_name TEXT NOT NULL,
    gl_code TEXT NOT NULL,
    budget TEXT NOT NULL DEFAULT '0.00',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS upload_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    rows_imported INTEGER NOT NULL,
    uploaded_at TEXT DEFAULT (datetime('now')),
    uploaded_by TEXT DEFAULT 'admin'
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_budget_fund ON budget_items(fund);
  CREATE INDEX IF NOT EXISTS idx_budget_center ON budget_items(center_name);
  CREATE INDEX IF NOT EXISTS idx_budget_activity ON budget_items(activity_detail);
`);

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

// Clear existing data
db.exec("DELETE FROM budget_items");

// Create upload record first
const uploadResult = db.prepare(
  "INSERT INTO upload_history (filename, rows_imported) VALUES (?, ?)"
).run(path.basename(excelPath), rows.length);
const uploadId = uploadResult.lastInsertRowid;

const insert = db.prepare(`
  INSERT INTO budget_items (upload_id, act_code_id, active_id, fund, activity_detail, prog, center_name, gl_code, budget)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((items: Record<string, unknown>[]) => {
  for (const row of items) {
    insert.run(
      uploadId,
      row["ActCodeID"] ?? null,
      row["ActiveID"] ?? null,
      String(row["Fund"] ?? ""),
      String(row["ActivityDetail"] ?? ""),
      String(row["Prog"] ?? ""),
      String(row["CenterName"] ?? ""),
      String(row["GLCode"] ?? ""),
      String(row["Budget"] ?? "0.00")
    );
  }
});

insertMany(rows);

db.prepare(
  "INSERT INTO logs (level, action, details) VALUES (?, ?, ?)"
).run("info", "seed", `Seeded ${rows.length} rows from ${path.basename(excelPath)}`);

console.log(`Seeded ${rows.length} budget items from ${path.basename(excelPath)}`);
db.close();
