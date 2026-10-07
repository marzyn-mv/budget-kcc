import { NextRequest, NextResponse } from "next/server";
import { addLog, getPool } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import logger from "@/lib/logger";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    await addLog("warn", "upload_unauthorized", "Unauthorized upload attempt");
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

    // Normalize column names: trim whitespace from keys
    const rows = rawRows.map((raw) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(raw)) {
        normalized[key.trim()] = value;
      }
      return normalized;
    });

    // Parse all rows
    const parsed = rows.map((row) => ({
      fund: String(row["Fund"] ?? "").trim(),
      activity_detail: String(row["Activity Detail"] ?? row["ActivityDetail"] ?? "").trim(),
      prog: String(row["Activity Number"] ?? row["Prog"] ?? "").trim(),
      section: String(row["Sections"] ?? row["Section"] ?? "").trim(),
      center_name: String(row["CenterName"] ?? row["Center Name"] ?? "").trim(),
      gl_code: String(row["GLCode"] ?? row["GL Code"] ?? "").trim(),
      budget: String(row["Budget"] ?? "0.00").trim(),
    }));

    // Check for duplicates against existing records
    const pool = await getPool();
    const client = await pool.connect();

    try {
      // Build a set of existing record keys for fast lookup
      const existingResult = await client.query(
        `SELECT fund, activity_detail, prog, center_name, gl_code FROM budget_items`
      );
      const existingKeys = new Set(
        existingResult.rows.map(
          (r: Record<string, string>) => `${r.fund}|${r.activity_detail}|${r.prog}|${r.center_name}|${r.gl_code}`
        )
      );

      // Filter out duplicates
      const newRows = parsed.filter(
        (r) => !existingKeys.has(`${r.fund}|${r.activity_detail}|${r.prog}|${r.center_name}|${r.gl_code}`)
      );
      const skippedCount = parsed.length - newRows.length;

      if (newRows.length === 0) {
        return NextResponse.json(
          { error: "All records already exist. No new data was imported.", skipped: skippedCount },
          { status: 409 }
        );
      }

      await client.query("BEGIN");

      const uploadResult = await client.query(
        "INSERT INTO upload_history (filename, rows_imported) VALUES ($1, $2) RETURNING id",
        [file.name, newRows.length]
      );
      const uploadId = uploadResult.rows[0].id;

      // Batch insert 50 rows at a time
      const BATCH_SIZE = 50;
      for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batch = newRows.slice(i, i + BATCH_SIZE);
        const placeholders: string[] = [];
        const params: (string | number)[] = [];

        batch.forEach((row, idx) => {
          const base = idx * 8;
          placeholders.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
          );
          params.push(uploadId, row.fund, row.activity_detail, row.prog, row.section, row.center_name, row.gl_code, row.budget);
        });

        await client.query(
          `INSERT INTO budget_items (upload_id, fund, activity_detail, prog, section, center_name, gl_code, budget)
           VALUES ${placeholders.join(", ")}`,
          params
        );
      }

      await client.query("COMMIT");

      await invalidateCache("budget:*");

      const msg = skippedCount > 0
        ? `Uploaded ${file.name}: ${newRows.length} new rows imported, ${skippedCount} duplicates skipped`
        : `Uploaded ${file.name} with ${newRows.length} rows`;
      logger.info("Excel uploaded", { filename: file.name, imported: newRows.length, skipped: skippedCount });
      await addLog("info", "upload", msg);

      return NextResponse.json({
        message: skippedCount > 0
          ? `${newRows.length} new rows imported. ${skippedCount} duplicate rows were skipped.`
          : "Upload successful",
        rowsImported: newRows.length,
        duplicatesSkipped: skippedCount,
      });
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("Upload failed", { error });
    await addLog("error", "upload_failed", String(error));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
