import { NextRequest, NextResponse } from "next/server";
import { addLog, getPool } from "@/lib/db";
import { verifySession } from "@/lib/auth";
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
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const pool = await getPool();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const uploadResult = await client.query(
        "INSERT INTO upload_history (filename, rows_imported) VALUES ($1, $2) RETURNING id",
        [file.name, rows.length]
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

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

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
