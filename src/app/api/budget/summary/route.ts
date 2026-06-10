import { NextResponse } from "next/server";
import { sql, addLog } from "@/lib/db";
import { getCached } from "@/lib/cache";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const data = await getCached(
      "budget:summary",
      async () => {
        const totalResult = await sql`
          SELECT COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items
        `;
        const totalRow = totalResult.rows[0];

        const byFundResult = await sql`
          SELECT fund, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY fund ORDER BY total DESC
        `;

        const byCenterResult = await sql`
          SELECT center_name as center, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY center_name ORDER BY total DESC
        `;

        return {
          totalItems: parseInt(totalRow.count),
          totalBudget: parseFloat(totalRow.total),
          byFund: byFundResult.rows.map((r) => ({
            ...r,
            count: parseInt(r.count),
            total: parseFloat(r.total),
          })),
          byCenter: byCenterResult.rows.map((r) => ({
            ...r,
            count: parseInt(r.count),
            total: parseFloat(r.total),
          })),
        };
      },
      3600 // 1 hour TTL
    );

    logger.info("Budget summary fetched");
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to fetch summary", { error });
    await addLog("error", "summary_fetch", String(error));
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
