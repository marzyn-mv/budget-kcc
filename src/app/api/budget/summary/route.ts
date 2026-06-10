import { NextResponse } from "next/server";
import getDb, { addLog } from "@/lib/db";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const db = getDb();

    const totalRow = db
      .prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS REAL)), 0) as total FROM budget_items"
      )
      .get() as { count: number; total: number };

    const byFund = db
      .prepare(
        `SELECT fund, COUNT(*) as count,
         COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS REAL)), 0) as total
         FROM budget_items GROUP BY fund ORDER BY total DESC`
      )
      .all() as { fund: string; count: number; total: number }[];

    const byCenter = db
      .prepare(
        `SELECT center_name as center, COUNT(*) as count,
         COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS REAL)), 0) as total
         FROM budget_items GROUP BY center_name ORDER BY total DESC`
      )
      .all() as { center: string; count: number; total: number }[];

    logger.info("Budget summary fetched");

    return NextResponse.json({
      totalItems: totalRow.count,
      totalBudget: totalRow.total,
      byFund,
      byCenter,
    });
  } catch (error) {
    logger.error("Failed to fetch summary", { error });
    addLog("error", "summary_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
