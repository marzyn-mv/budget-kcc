import { NextRequest, NextResponse } from "next/server";
import getDb, { addLog } from "@/lib/db";
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

    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (search) {
      conditions.push(
        "(activity_detail LIKE ? OR prog LIKE ? OR gl_code LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (fund) {
      conditions.push("fund = ?");
      params.push(fund);
    }
    if (center) {
      conditions.push("center_name = ?");
      params.push(center);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM budget_items ${where}`)
      .get(...params) as { count: number };

    const items = db
      .prepare(
        `SELECT * FROM budget_items ${where} ORDER BY id ASC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    // Summary: total budget for filtered results
    const sumRow = db
      .prepare(
        `SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS REAL)), 0) as total FROM budget_items ${where}`
      )
      .get(...params) as { total: number };

    // Get filter options
    const funds = db
      .prepare("SELECT DISTINCT fund FROM budget_items ORDER BY fund")
      .all() as { fund: string }[];
    const centers = db
      .prepare(
        "SELECT DISTINCT center_name FROM budget_items ORDER BY center_name"
      )
      .all() as { center_name: string }[];

    logger.info("Budget data fetched", { search, fund, center, page });

    return NextResponse.json({
      items,
      total: countRow.count,
      totalBudget: sumRow.total,
      page,
      limit,
      totalPages: Math.ceil(countRow.count / limit),
      filters: {
        funds: funds.map((f) => f.fund),
        centers: centers.map((c) => c.center_name),
      },
    });
  } catch (error) {
    logger.error("Failed to fetch budget data", { error });
    addLog("error", "budget_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch budget data" },
      { status: 500 }
    );
  }
}
