import { sql, createPool } from "@vercel/postgres";
import type { VercelPool } from "@vercel/postgres";

let initialized = false;

async function ensureTables() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS budget_items (
      id SERIAL PRIMARY KEY,
      upload_id INTEGER,
      act_code_id INTEGER,
      active_id INTEGER,
      fund TEXT NOT NULL,
      activity_detail TEXT NOT NULL,
      prog TEXT NOT NULL,
      center_name TEXT NOT NULL,
      gl_code TEXT NOT NULL,
      budget TEXT NOT NULL DEFAULT '0.00',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS upload_history (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      rows_imported INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      uploaded_by TEXT DEFAULT 'admin'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      level TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_budget_fund ON budget_items(fund)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_budget_center ON budget_items(center_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_budget_activity ON budget_items(activity_detail)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at)`;

  initialized = true;
}

export async function getPool(): Promise<VercelPool> {
  await ensureTables();
  return createPool();
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: (string | number | null)[]
) {
  await ensureTables();
  const pool = createPool();
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
    // Silently fail — logging should never crash a request
    console.error("Failed to write log to database");
  }
}

export { sql, ensureTables };
