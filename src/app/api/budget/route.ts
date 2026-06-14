import { NextRequest, NextResponse } from "next/server";
import { sql, query, addLog } from "@/lib/db";
import { getCached } from "@/lib/cache";
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

    // Cache filter options (funds & centers) — 1 hour TTL
    const filters = await getCached(
      "budget:filters",
      async () => {
        const fundsResult = await sql`SELECT DISTINCT fund FROM budget_items ORDER BY fund`;
        const centersResult = await sql`SELECT DISTINCT center_name FROM budget_items ORDER BY center_name`;
        return {
          funds: fundsResult.rows.map((f) => f.fund),
          centers: centersResult.rows.map((c) => c.center_name),
        };
      },
      3600
    );

    // Build WHERE clause
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

    // Run count, items, and sum in parallel
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

    // Build unique (gl_code, activity_detail, fund) keys from current page items
    const keys = itemsResult.rows.map((r) => {
      const row = r as Record<string, string>;
      return {
        gl_code: row.gl_code,
        activity_detail: row.activity_detail,
        fund: row.fund,
      };
    });

    // Batch-fetch spent amounts (always fresh, never cached)
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

    logger.info("Budget data fetched", { search, fund, center, page });

    return NextResponse.json({
      items: rows,
      total: count,
      totalBudget: parseFloat(sumResult.rows[0].total),
      page: showAll ? 1 : page,
      limit: effectiveLimit,
      totalPages: showAll ? 1 : Math.ceil(count / limit),
      filters,
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
