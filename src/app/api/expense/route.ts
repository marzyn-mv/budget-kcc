import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { getCached } from "@/lib/cache";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "po-report";
    const search = searchParams.get("search") || "";
    const fund = searchParams.get("fund") || "";
    const glCode = searchParams.get("gl_code") || "";
    const activity = searchParams.get("activity") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const table = type === "voucher-report" ? "voucher_reports" : "po_reports";

    // Cache filter options — 1 hour
    const filters = await getCached(
      `expense:${type}:filters`,
      async () => {
        const [fundsR, glR, actR] = await Promise.all([
          query(`SELECT DISTINCT fund_code FROM ${table} ORDER BY fund_code`),
          query(`SELECT DISTINCT gl_code FROM ${table} ORDER BY gl_code`),
          query(`SELECT DISTINCT activity_detail FROM ${table} ORDER BY activity_detail`),
        ]);
        return {
          funds: fundsR.rows.map((r) => (r as Record<string, string>).fund_code),
          glCodes: glR.rows.map((r) => (r as Record<string, string>).gl_code),
          activities: actR.rows.map((r) => (r as Record<string, string>).activity_detail),
        };
      },
      3600
    );

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(activity_detail ILIKE $${paramIndex} OR supplier ILIKE $${paramIndex + 1} OR gl_code ILIKE $${paramIndex + 2})`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    if (fund) {
      conditions.push(`fund_code = $${paramIndex}`);
      params.push(fund);
      paramIndex++;
    }
    if (glCode) {
      conditions.push(`gl_code = $${paramIndex}`);
      params.push(glCode);
      paramIndex++;
    }
    if (activity) {
      conditions.push(`activity_detail = $${paramIndex}`);
      params.push(activity);
      paramIndex++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    // Run count+sum and items in parallel
    const [countSumResult, items] = await Promise.all([
      query<{ count: string; total: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ${table} ${where}`,
        params
      ),
      query(
        `SELECT * FROM ${table} ${where} ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
    ]);

    const count = parseInt(countSumResult.rows[0].count);

    return NextResponse.json({
      items: items.rows,
      total: count,
      totalAmount: parseFloat(countSumResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      filters,
    });
  } catch (error) {
    logger.error("Failed to fetch expense data", { error });
    await addLog("error", "expense_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch expense data" },
      { status: 500 }
    );
  }
}
