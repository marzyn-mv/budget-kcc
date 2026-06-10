import { NextRequest, NextResponse } from "next/server";
import { sql, query, addLog } from "@/lib/db";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const fund = searchParams.get("fund") || "";
    const center = searchParams.get("center") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(activity_detail ILIKE $${paramIndex} OR prog ILIKE $${paramIndex + 1} OR gl_code ILIKE $${paramIndex + 2})`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      paramIndex += 3;
    }
    if (fund) {
      conditions.push(`fund = $${paramIndex}`);
      params.push(fund);
      paramIndex++;
    }
    if (center) {
      conditions.push(`center_name = $${paramIndex}`);
      params.push(center);
      paramIndex++;
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM budget_items ${where}`,
      params
    );
    const count = parseInt(countResult.rows[0].count);

    const items = await query(
      `SELECT * FROM budget_items ${where} ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const sumResult = await query<{ total: string }>(
      `SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total FROM budget_items ${where}`,
      params
    );

    const fundsResult = await sql`SELECT DISTINCT fund FROM budget_items ORDER BY fund`;
    const centersResult = await sql`SELECT DISTINCT center_name FROM budget_items ORDER BY center_name`;

    logger.info("Budget data fetched", { search, fund, center, page });

    return NextResponse.json({
      items: items.rows,
      total: count,
      totalBudget: parseFloat(sumResult.rows[0].total),
      page,
      limit,
      totalPages: Math.ceil(count / limit),
      filters: {
        funds: fundsResult.rows.map((f) => f.fund),
        centers: centersResult.rows.map((c) => c.center_name),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch budget data", { error });
    await addLog("error", "budget_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch budget data" },
      { status: 500 }
    );
  }
}
