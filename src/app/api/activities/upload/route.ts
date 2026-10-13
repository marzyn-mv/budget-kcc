import { NextRequest, NextResponse } from "next/server";
import { addLog, getPool, query } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    // Normalize column names
    const rows = rawRows.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const trimmedKey = key.trim().replace(/\s+/g, " ");
        normalized[trimmedKey] = String(value ?? "").trim();
      }
      return normalized;
    });

    // Map columns - support various column name formats
    const getCol = (row: Record<string, string>, ...names: string[]) => {
      for (const name of names) {
        const key = Object.keys(row).find(
          (k) => k.toLowerCase() === name.toLowerCase()
        );
        if (key && row[key]) return row[key];
      }
      return "";
    };

    // Create upload history record
    const pool = await getPool();
    const uploadResult = await pool.query(
      `INSERT INTO upload_history (filename, rows_imported, uploaded_by) VALUES ($1, $2, $3) RETURNING id`,
      [file.name, 0, "admin"]
    );
    const uploadId = uploadResult.rows[0].id;

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const activityDetail = getCol(row, "Activity Detail", "ActivityDetail", "Activity_Detail");
      const activityNumber = getCol(row, "Activity Number", "ActivityNumber", "Activity_Number", "Prog");
      const section = getCol(row, "Sections", "Section");
      const fund = getCol(row, "Fund", "FundCode", "Fund Code");

      if (!activityDetail) {
        skipped++;
        continue;
      }

      try {
        // Check for duplicates by activity_detail + fund
        const existing = await pool.query(
          `SELECT id FROM activities WHERE activity_detail = $1 AND fund = $2`,
          [activityDetail, fund]
        );
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        await pool.query(
          `INSERT INTO activities (activity_detail, activity_number, section, fund, upload_id) VALUES ($1, $2, $3, $4, $5)`,
          [activityDetail, activityNumber, section, fund, uploadId]
        );
        imported++;
      } catch (err) {
        errors.push(`Row ${i + 2}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    // Update upload history with actual count
    await pool.query(`UPDATE upload_history SET rows_imported = $1 WHERE id = $2`, [imported, uploadId]);

    await addLog(
      "info",
      "activity_upload",
      `Uploaded ${file.name}: ${imported} imported, ${skipped} skipped`
    );

    return NextResponse.json({
      message: `${imported} activities imported, ${skipped} skipped (duplicates/empty)`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to upload activities" }, { status: 500 });
  }
}
