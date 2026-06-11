import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gl_code = searchParams.get("gl_code") || "";
    const activity = searchParams.get("activity") || "";
    const fund = searchParams.get("fund") || "";

    if (!gl_code || !activity || !fund) {
      return NextResponse.json(
        { error: "gl_code, activity, and fund are required" },
        { status: 400 }
      );
    }

    const [poResult, voucherResult] = await Promise.all([
      query(
        `SELECT id, po_create_date, po_full, supplier, total, po_remarks, cancelled
         FROM po_reports
         WHERE gl_code = $1 AND activity_detail = $2 AND fund_code = $3
         ORDER BY po_create_date DESC`,
        [gl_code, activity, fund]
      ),
      query(
        `SELECT id, produce_date, voucher_full, supplier, voucher_type, total, reason, cancelled, cheque_no
         FROM voucher_reports
         WHERE gl_code = $1 AND activity_detail = $2 AND fund_code = $3
         ORDER BY produce_date DESC`,
        [gl_code, activity, fund]
      ),
    ]);

    const poTotal = poResult.rows.reduce(
      (sum, r) => sum + parseFloat(String(r.total) || "0"),
      0
    );
    const voucherTotal = voucherResult.rows.reduce(
      (sum, r) => sum + parseFloat(String(r.total) || "0"),
      0
    );

    return NextResponse.json({
      poTotal,
      voucherTotal,
      totalExpense: poTotal + voucherTotal,
      poItems: poResult.rows,
      voucherItems: voucherResult.rows,
    });
  } catch (error) {
    logger.error("Failed to fetch expense details", { error });
    await addLog("error", "expense_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch expense details" },
      { status: 500 }
    );
  }
}
