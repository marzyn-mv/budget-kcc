import { NextRequest, NextResponse } from "next/server";
import getDb, { addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import logger from "@/lib/logger";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    addLog("warn", "upload_unauthorized", "Unauthorized upload attempt");
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

    const db = getDb();

    // Create upload record first to get the ID
    const uploadResult = db.prepare(
      "INSERT INTO upload_history (filename, rows_imported) VALUES (?, ?)"
    ).run(file.name, rows.length);
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

    logger.info("Excel uploaded", { filename: file.name, rows: rows.length });
    addLog("info", "upload", `Uploaded ${file.name} with ${rows.length} rows`);

    return NextResponse.json({
      message: "Upload successful",
      rowsImported: rows.length,
    });
  } catch (error) {
    logger.error("Upload failed", { error });
    addLog("error", "upload_failed", String(error));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
