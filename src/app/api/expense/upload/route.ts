import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import logger from "@/lib/logger";
import * as XLSX from "xlsx";

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value || null;
    if (!verifySession(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!type || !["po-report", "voucher-report"].includes(type)) {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const uploadResult = await query<{ id: number }>(
      `INSERT INTO upload_history (filename, rows_imported, uploaded_by) VALUES ($1, $2, 'admin') RETURNING id`,
      [file.name, rows.length]
    );
    const uploadId = uploadResult.rows[0].id;

    if (type === "po-report") {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values: string[] = [];
        const params: (string | number)[] = [];
        let idx = 1;

        for (const row of batch) {
          values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12},$${idx+13},$${idx+14},$${idx+15},$${idx+16},$${idx+17})`);
          params.push(
            uploadId,
            String(row.IslandNameEng || ""),
            String(row.PoCreateDate || ""),
            String(row.GLcode || ""),
            String(row.PoFull || ""),
            String(row.Supplier || ""),
            Number(row.Total) || 0,
            String(row.PoRemarks || ""),
            String(row.BizArea || ""),
            String(row.costCenter || ""),
            String(row.FundCode || ""),
            String(row.FunctionalArea || ""),
            String(row.ActivityDetail || ""),
            String(row.CenterName || ""),
            String(row.Authorisation || ""),
            String(row.Printed || ""),
            String(row.Cancelled || ""),
            String(row.POCancelNote || ""),
          );
          idx += 18;
        }

        await query(
          `INSERT INTO po_reports (upload_id, island_name, po_create_date, gl_code, po_full, supplier, total, po_remarks, biz_area, cost_center, fund_code, functional_area, activity_detail, center_name, authorisation, printed, cancelled, po_cancel_note)
           VALUES ${values.join(",")}`,
          params
        );
      }
    } else {
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const values: string[] = [];
        const params: (string | number)[] = [];
        let idx = 1;

        for (const row of batch) {
          values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12},$${idx+13},$${idx+14},$${idx+15},$${idx+16},$${idx+17},$${idx+18},$${idx+19},$${idx+20},$${idx+21})`);
          params.push(
            uploadId,
            String(row.IslandNameEng || ""),
            String(row.ProduceDate || ""),
            String(row.GLcode || ""),
            String(row.VoucherFull || ""),
            String(row.Supplier || ""),
            String(row["Voucher Type"] || ""),
            Number(row.Total) || 0,
            String(row.Reason || ""),
            String(row.BizArea || ""),
            String(row.costCenter || ""),
            String(row.FundCode || ""),
            String(row.FunctionalArea || ""),
            String(row.ActivityDetail || ""),
            String(row.CenterName || ""),
            String(row.Authorisation || ""),
            String(row.Printed || ""),
            String(row.Cancelled || ""),
            String(row.VoucherCancellationReason || ""),
            String(row.PO || ""),
            String(row["Cheque No"] || ""),
            String(row.PayBy || ""),
          );
          idx += 22;
        }

        await query(
          `INSERT INTO voucher_reports (upload_id, island_name, produce_date, gl_code, voucher_full, supplier, voucher_type, total, reason, biz_area, cost_center, fund_code, functional_area, activity_detail, center_name, authorisation, printed, cancelled, cancellation_reason, po, cheque_no, pay_by)
           VALUES ${values.join(",")}`,
          params
        );
      }
    }

    await addLog("info", `${type}_upload`, `Uploaded ${file.name}: ${rows.length} rows`);
    logger.info(`${type} uploaded`, { filename: file.name, rows: rows.length });

    return NextResponse.json({
      message: "Upload successful",
      rowsImported: rows.length,
    });
  } catch (error) {
    logger.error("Expense upload failed", { error });
    await addLog("error", "expense_upload", String(error));
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
