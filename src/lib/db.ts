import { sql, createPool } from "@vercel/postgres";
import type { VercelPool } from "@vercel/postgres";

let initialized = false;
let _pool: VercelPool | null = null;
let initPromise: Promise<void> | null = null;

async function ensureTables() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS budget_items (
      id SERIAL PRIMARY KEY, upload_id INTEGER, act_code_id INTEGER, active_id INTEGER,
      fund TEXT NOT NULL, activity_detail TEXT NOT NULL, prog TEXT NOT NULL,
      center_name TEXT NOT NULL, gl_code TEXT NOT NULL, budget TEXT NOT NULL DEFAULT '0.00',
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`;

    await sql`CREATE TABLE IF NOT EXISTS upload_history (
      id SERIAL PRIMARY KEY, filename TEXT NOT NULL, rows_imported INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(), uploaded_by TEXT DEFAULT 'admin')`;

    await sql`CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY, level TEXT NOT NULL, action TEXT NOT NULL,
      details TEXT, ip TEXT, created_at TIMESTAMP DEFAULT NOW())`;

    await sql`CREATE TABLE IF NOT EXISTS po_reports (
      id SERIAL PRIMARY KEY, upload_id INTEGER, island_name TEXT, po_create_date TEXT,
      gl_code TEXT NOT NULL, po_full TEXT, supplier TEXT, total NUMERIC DEFAULT 0,
      po_remarks TEXT, biz_area TEXT, cost_center TEXT, fund_code TEXT NOT NULL,
      functional_area TEXT, activity_detail TEXT NOT NULL, center_name TEXT,
      authorisation TEXT, printed TEXT, cancelled TEXT, po_cancel_note TEXT,
      created_at TIMESTAMP DEFAULT NOW())`;

    await sql`CREATE TABLE IF NOT EXISTS voucher_reports (
      id SERIAL PRIMARY KEY, upload_id INTEGER, island_name TEXT, produce_date TEXT,
      gl_code TEXT NOT NULL, voucher_full TEXT, supplier TEXT, voucher_type TEXT,
      total NUMERIC DEFAULT 0, reason TEXT, biz_area TEXT, cost_center TEXT,
      fund_code TEXT NOT NULL, functional_area TEXT, activity_detail TEXT NOT NULL,
      center_name TEXT, authorisation TEXT, printed TEXT, cancelled TEXT,
      cancellation_reason TEXT, po TEXT, cheque_no TEXT, pay_by TEXT,
      created_at TIMESTAMP DEFAULT NOW())`;

    await sql`CREATE INDEX IF NOT EXISTS idx_budget_fund ON budget_items(fund)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_center ON budget_items(center_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_budget_activity ON budget_items(activity_detail)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_po_gl ON po_reports(gl_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_po_fund ON po_reports(fund_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_po_activity ON po_reports(activity_detail)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_po_match ON po_reports(gl_code, activity_detail, fund_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_gl ON voucher_reports(gl_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_fund ON voucher_reports(fund_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_activity ON voucher_reports(activity_detail)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_voucher_match ON voucher_reports(gl_code, activity_detail, fund_code)`;

    initialized = true;
  })();

  return initPromise;
}

async function getPool(): Promise<VercelPool> {
  await ensureTables();
  if (!_pool) {
    _pool = createPool();
  }
  return _pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: (string | number | null)[]
) {
  const pool = await getPool();
  const result = await pool.query<T>(text, params);
  return result;
}

export async function addLog(
  level: string,
  action: string,
  details?: string,
  ip?: string
) {
  try {
    await sql`
      INSERT INTO logs (level, action, details, ip)
      VALUES (${level}, ${action}, ${details || null}, ${ip || null})
    `;
  } catch {
    console.error("Failed to write log to database");
  }
}

export { sql, ensureTables, getPool };
