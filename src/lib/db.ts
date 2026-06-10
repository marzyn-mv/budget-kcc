import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "budget.db");

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
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
    CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);
  `);
}

export function addLog(
  level: string,
  action: string,
  details?: string,
  ip?: string
) {
  const db = getDb();
  db.prepare(
    "INSERT INTO logs (level, action, details, ip) VALUES (?, ?, ?, ?)"
  ).run(level, action, details || null, ip || null);
}

export default getDb;
