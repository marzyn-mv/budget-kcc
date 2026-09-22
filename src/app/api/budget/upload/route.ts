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

    const pool = await getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const uploadResult = await client.query(
        "INSERT INTO upload_history (filename, rows_imported) VALUES ($1, $2) RETURNING id",
        [file.name, rows.length]
      );
      const uploadId = uploadResult.rows[0].id;

      // Parse all rows into values
      const parsed = rows.map((row) => [
        uploadId,
        String(row["Fund"] ?? "").trim(),
        String(row["Activity Detail"] ?? row["ActivityDetail"] ?? "").trim(),
        String(row["Activity Number"] ?? row["Prog"] ?? "").trim(),
        String(row["Sections"] ?? row["Section"] ?? "").trim(),
        String(row["CenterName"] ?? row["Center Name"] ?? "").trim(),
        String(row["GLCode"] ?? row["GL Code"] ?? "").trim(),
        String(row["Budget"] ?? "0.00").trim(),
      ]);

      // Batch insert 50 rows at a time
      const BATCH_SIZE = 50;
      for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
        const batch = parsed.slice(i, i + BATCH_SIZE);
        const placeholders: string[] = [];
        const params: (string | number)[] = [];

        batch.forEach((vals, idx) => {
          const base = idx * 8;
          placeholders.push(
            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
          );
          params.push(...vals);
        });

        await client.query(
          `INSERT INTO budget_items (upload_id, fund, activity_detail, prog, section, center_name, gl_code, budget)
           VALUES ${placeholders.join(", ")}`,
          params
        );
      }

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await invalidateCache("budget:*");

    logger.info("Excel uploaded", { filename: file.name, rows: rows.length });
    await addLog("info", "upload", `Uploaded ${file.name} with ${rows.length} rows`);

    return NextResponse.json({
      message: "Upload successful",
      rowsImported: rows.length,
    });
  } catch (error) {
    logger.error("Upload failed", { error });
    await addLog("error", "upload_failed", String(error));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
