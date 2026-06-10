/**
 * Seed script: Import Excel budget data into Postgres
 * Usage: npx tsx scripts/seed.ts <path-to-excel>
 *
 * Requires POSTGRES_URL environment variable (or .env.local with it).
 */
import { createPool } from "@vercel/postgres";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

// Load .env.local for local development
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^\s*([\w]+)\s*=\s*"?(.+?)"?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2];
    }
  }
}

const excelPath = process.argv[2];
if (!excelPath) {
  console.error("Usage: npx tsx scripts/seed.ts <path-to-excel>");
  process.exit(1);
}

async function main() {
  const pool = createPool();

  // Create tables
  await pool.query(`
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
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upload_history (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      rows_imported INTEGER NOT NULL,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      uploaded_by TEXT DEFAULT 'admin'
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS logs (
      id SERIAL PRIMARY KEY,
      level TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_fund ON budget_items(fund)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_center ON budget_items(center_name)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_budget_activity ON budget_items(activity_detail)`);

  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear existing data
    await client.query("DELETE FROM budget_items");

    // Create upload record
    const uploadResult = await client.query(
      "INSERT INTO upload_history (filename, rows_imported) VALUES ($1, $2) RETURNING id",
      [path.basename(excelPath), rows.length]
    );
    const uploadId = uploadResult.rows[0].id;

    for (const row of rows) {
      await client.query(
        `INSERT INTO budget_items (upload_id, act_code_id, active_id, fund, activity_detail, prog, center_name, gl_code, budget)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          uploadId,
          (row["ActCodeID"] as number) ?? null,
          (row["ActiveID"] as number) ?? null,
          String(row["Fund"] ?? ""),
          String(row["ActivityDetail"] ?? ""),
          String(row["Prog"] ?? ""),
          String(row["CenterName"] ?? ""),
          String(row["GLCode"] ?? ""),
          String(row["Budget"] ?? "0.00"),
        ]
      );
    }

    await client.query(
      "INSERT INTO logs (level, action, details) VALUES ($1, $2, $3)",
      ["info", "seed", `Seeded ${rows.length} rows from ${path.basename(excelPath)}`]
    );

    await client.query("COMMIT");
    console.log(`Seeded ${rows.length} budget items from ${path.basename(excelPath)}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
