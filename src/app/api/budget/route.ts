import { NextRequest, NextResponse } from "next/server";
import { sql, query, addLog } from "@/lib/db";
import { getCached } from "@/lib/cache";
import logger from "@/lib/logger";

async function fetchFilters() {
  return getCached(
    "budget:filters",
    async () => {
      const [fundsResult, centersResult] = await Promise.all([
        sql`SELECT DISTINCT fund FROM budget_items ORDER BY fund`,
        sql`SELECT DISTINCT center_name FROM budget_items ORDER BY center_name`,
      ]);
      return {
        funds: fundsResult.rows.map((f) => f.fund),
        centers: centersResult.rows.map((c) => c.center_name),
      };
    },
    3600
  );
}

async function fetchSummary() {
  return getCached(
    "budget:summary",
    async () => {
      const [totalResult, spentResult, byFundResult, byCenterResult] = await Promise.all([
        sql`
          SELECT COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items
        `,
        sql`
          SELECT COALESCE(
            COALESCE((SELECT SUM(total) FROM po_reports), 0) +
            COALESCE((SELECT SUM(total) FROM voucher_reports), 0),
          0) as total_spent
        `,
        sql`
          SELECT fund, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY fund ORDER BY total DESC
        `,
        sql`
          SELECT center_name as center, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY center_name ORDER BY total DESC
        `,
      ]);

      const totalRow = totalResult.rows[0];

      return {
        totalItems: parseInt(totalRow.count),
        totalBudget: parseFloat(totalRow.total),
        totalSpent: parseFloat(spentResult.rows[0].total_spent) || 0,
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
    300
  );
}

async function fetchList(
  search: string,
  fund: string,
  center: string,
  page: number,
  limit: number,
  offset: number
) {
  const cacheKey = `budget:list:${search}|${fund}|${center}|${page}|${limit}`;

  return getCached(
    cacheKey,
    async () => {
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

      const showAll = limit <= 0;

      const [countResult, itemsResult, sumResult] = await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM budget_items ${where}`,
          params
        ),
        showAll
          ? query(
              `SELECT * FROM budget_items ${where} ORDER BY id ASC`,
              params
            )
          : query(
              `SELECT * FROM budget_items ${where} ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
              [...params, limit, offset]
            ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total FROM budget_items ${where}`,
          params
        ),
      ]);

      const count = parseInt(countResult.rows[0].count);

      const keys = itemsResult.rows.map((r) => {
        const row = r as Record<string, string>;
        return {
          gl_code: row.gl_code,
          activity_detail: row.activity_detail,
          fund: row.fund,
        };
      });

      const spentMap = new Map<string, { po: number; voucher: number }>();

      if (keys.length > 0) {
        const uniqueKeys = [...new Map(keys.map((k) => [
          `${k.gl_code}|${k.activity_detail}|${k.fund}`, k
        ])).values()];

        const valuesPlaceholders: string[] = [];
        const valuesParams: string[] = [];
        uniqueKeys.forEach((k, i) => {
          const base = i * 3;
          valuesPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
          valuesParams.push(k.gl_code, k.activity_detail, k.fund);
        });

        const valuesClause = valuesPlaceholders.join(", ");

        const [poSpent, voucherSpent] = await Promise.all([
          query<{ gl_code: string; activity_detail: string; fund_code: string; total: string }>(
            `SELECT gl_code, activity_detail, fund_code, COALESCE(SUM(total), 0) as total
             FROM po_reports
             WHERE (gl_code, activity_detail, fund_code) IN (${valuesClause})
             GROUP BY gl_code, activity_detail, fund_code`,
            valuesParams
          ),
          query<{ gl_code: string; activity_detail: string; fund_code: string; total: string }>(
            `SELECT gl_code, activity_detail, fund_code, COALESCE(SUM(total), 0) as total
             FROM voucher_reports
             WHERE (gl_code, activity_detail, fund_code) IN (${valuesClause})
             GROUP BY gl_code, activity_detail, fund_code`,
            valuesParams
          ),
        ]);

        for (const r of poSpent.rows) {
          const key = `${r.gl_code}|${r.activity_detail}|${r.fund_code}`;
          const entry = spentMap.get(key) || { po: 0, voucher: 0 };
          entry.po = parseFloat(r.total);
          spentMap.set(key, entry);
        }
        for (const r of voucherSpent.rows) {
          const key = `${r.gl_code}|${r.activity_detail}|${r.fund_code}`;
          const entry = spentMap.get(key) || { po: 0, voucher: 0 };
          entry.voucher = parseFloat(r.total);
          spentMap.set(key, entry);
        }
      }

      const rows = itemsResult.rows.map((r) => {
        const row = r as Record<string, unknown>;
        const key = `${row.gl_code}|${row.activity_detail}|${row.fund}`;
        const spent = spentMap.get(key) || { po: 0, voucher: 0 };
        return {
          ...r,
          po_spent: spent.po,
          voucher_spent: spent.voucher,
        };
      });

      const effectiveLimit = showAll ? count : limit;

      return {
        items: rows,
        total: count,
        totalBudget: parseFloat(sumResult.rows[0].total),
        page: showAll ? 1 : page,
        limit: effectiveLimit,
        totalPages: showAll ? 1 : Math.ceil(count / limit),
      };
    },
    60
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const fund = searchParams.get("fund") || "";
    const center = searchParams.get("center") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Fetch filters, summary, and list data ALL in parallel
    const [filters, summary, list] = await Promise.all([
      fetchFilters(),
      fetchSummary(),
      fetchList(search, fund, center, page, limit, offset),
    ]);

    logger.info("Budget data fetched", { search, fund, center, page });

    return NextResponse.json({
      ...list,
      filters,
      summary,
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
