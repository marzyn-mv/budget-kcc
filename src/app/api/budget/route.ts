import { NextRequest, NextResponse } from "next/server";
import { sql, query, addLog } from "@/lib/db";
import { getCached } from "@/lib/cache";
import logger from "@/lib/logger";

async function fetchFilters() {
  return getCached(
    "budget:filters",
    async () => {
      const [fundsResult, centersResult, sectionsResult] = await Promise.all([
        sql`SELECT DISTINCT fund FROM budget_items ORDER BY fund`,
        sql`SELECT DISTINCT center_name FROM budget_items ORDER BY center_name`,
        sql`SELECT DISTINCT section FROM budget_items WHERE section != '' ORDER BY section`,
      ]);
      return {
        funds: fundsResult.rows.map((f) => f.fund),
        centers: centersResult.rows.map((c) => c.center_name),
        sections: sectionsResult.rows.map((s) => s.section),
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
          SELECT
            COALESCE((SELECT SUM(p.total) FROM po_reports p WHERE p.cancelled != 'Yes' AND p.po_full IS NOT NULL AND p.po_full != ''
              AND (p.gl_code, TRIM(p.activity_detail), p.fund_code) IN (SELECT gl_code, TRIM(activity_detail), fund FROM budget_items)
            ), 0) as po_total,
            COALESCE((SELECT SUM(vr.total) FROM voucher_reports vr WHERE vr.cancelled != 'Yes'
              AND vr.voucher_type = 'Other'
              AND (vr.po IS NULL OR vr.po = '' OR vr.po = '-'
                OR vr.po NOT IN (SELECT po_full FROM po_reports pr WHERE pr.po_full IS NOT NULL AND pr.po_full != '' AND pr.cancelled != 'Yes'
                  AND TRIM(pr.activity_detail) = TRIM(vr.activity_detail) AND pr.gl_code = vr.gl_code AND pr.fund_code = vr.fund_code))
              AND (vr.gl_code, TRIM(vr.activity_detail), vr.fund_code) IN (SELECT gl_code, TRIM(activity_detail), fund FROM budget_items)
            ), 0) as other_pv_total,
            COALESCE((SELECT SUM(a.total) FROM acr_reports a WHERE a.cancelled != 'Yes'
              AND (a.gl_code, TRIM(a.activity_detail), a.fund_code) IN (SELECT gl_code, TRIM(activity_detail), fund FROM budget_items)
            ), 0) as total_acr
        `,
        sql`
          SELECT b.fund, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(b.budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total,
            COALESCE(SUM(
              (SELECT COALESCE(SUM(bc.amount), 0) FROM budget_controls bc
               WHERE TRIM(bc.cr_activity) = TRIM(b.activity_detail) AND bc.cr_gl_code = b.gl_code AND bc.cr_fund = b.fund)
              -
              (SELECT COALESCE(SUM(bc.amount), 0) FROM budget_controls bc
               WHERE TRIM(bc.dr_activity) = TRIM(b.activity_detail) AND bc.dr_gl_code = b.gl_code AND bc.dr_fund = b.fund)
            ), 0) as bc_net
          FROM budget_items b GROUP BY b.fund ORDER BY total DESC
        `,
        sql`
          SELECT b.center_name as center, COUNT(*) as count,
            COALESCE(SUM(CAST(REPLACE(REPLACE(b.budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total,
            COALESCE(SUM(
              (SELECT COALESCE(SUM(bc.amount), 0) FROM budget_controls bc
               WHERE TRIM(bc.cr_activity) = TRIM(b.activity_detail) AND bc.cr_gl_code = b.gl_code AND bc.cr_fund = b.fund)
              -
              (SELECT COALESCE(SUM(bc.amount), 0) FROM budget_controls bc
               WHERE TRIM(bc.dr_activity) = TRIM(b.activity_detail) AND bc.dr_gl_code = b.gl_code AND bc.dr_fund = b.fund)
            ), 0) as bc_net
          FROM budget_items b GROUP BY b.center_name ORDER BY total DESC
        `,
      ]);

      const totalRow = totalResult.rows[0];
      const approvedBudget = parseFloat(totalRow.total);
      const poTotal = parseFloat(spentResult.rows[0].po_total) || 0;
      const otherPvTotal = parseFloat(spentResult.rows[0].other_pv_total) || 0;

      return {
        totalItems: parseInt(totalRow.count),
        totalBudget: approvedBudget,
        totalBcNet: 0, // Budget controls are zero-sum globally
        totalSpent: poTotal + otherPvTotal,
        totalAcr: parseFloat(spentResult.rows[0].total_acr) || 0,
        byFund: byFundResult.rows.map((r) => ({
          ...r,
          count: parseInt(r.count),
          total: parseFloat(r.total) + (parseFloat(r.bc_net) || 0),
        })),
        byCenter: byCenterResult.rows.map((r) => ({
          ...r,
          count: parseInt(r.count),
          total: parseFloat(r.total) + (parseFloat(r.bc_net) || 0),
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
  sections: string[],
  page: number,
  limit: number,
  offset: number
) {
  const cacheKey = `budget:list:${search}|${fund}|${center}|${sections.join(",")}|${page}|${limit}`;

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
      if (sections.length > 0) {
        const placeholders = sections.map((_, i) => `$${paramIndex + i}`).join(", ");
        conditions.push(`section IN (${placeholders})`);
        params.push(...sections);
        paramIndex += sections.length;
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
          activity_detail: (row.activity_detail || "").trim(),
          fund: row.fund,
        };
      });

      const spentMap = new Map<string, { po: number; voucher: number; acr: number }>();
      const bcMap = new Map<string, number>();

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

        const [poSpent, voucherSpent, acrSpent] = await Promise.all([
          // PO total (all active POs, excluding summary rows with empty po_full)
          query<{ gl_code: string; activity_detail: string; fund_code: string; total: string }>(
            `SELECT gl_code, TRIM(activity_detail) as activity_detail, fund_code, COALESCE(SUM(total), 0) as total
             FROM po_reports
             WHERE cancelled != 'Yes' AND po_full IS NOT NULL AND po_full != ''
               AND (gl_code, TRIM(activity_detail), fund_code) IN (${valuesClause})
             GROUP BY gl_code, TRIM(activity_detail), fund_code`,
            valuesParams
          ),
          // Other PV: vouchers of type 'Other' that are NOT linked to an existing PO
          query<{ gl_code: string; activity_detail: string; fund_code: string; total: string }>(
            `SELECT gl_code, TRIM(activity_detail) as activity_detail, fund_code, COALESCE(SUM(total), 0) as total
             FROM voucher_reports vr
             WHERE vr.cancelled != 'Yes'
               AND vr.voucher_type = 'Other'
               AND (vr.po IS NULL OR vr.po = '' OR vr.po = '-'
                 OR vr.po NOT IN (SELECT po_full FROM po_reports pr WHERE pr.po_full IS NOT NULL AND pr.po_full != '' AND pr.cancelled != 'Yes'
                   AND TRIM(pr.activity_detail) = TRIM(vr.activity_detail) AND pr.gl_code = vr.gl_code AND pr.fund_code = vr.fund_code))
               AND (vr.gl_code, TRIM(vr.activity_detail), vr.fund_code) IN (${valuesClause})
             GROUP BY gl_code, TRIM(activity_detail), fund_code`,
            valuesParams
          ),
          // ACR total (active ACRs)
          query<{ gl_code: string; activity_detail: string; fund_code: string; total: string }>(
            `SELECT gl_code, TRIM(activity_detail) as activity_detail, fund_code, COALESCE(SUM(total), 0) as total
             FROM acr_reports
             WHERE cancelled != 'Yes'
               AND (gl_code, TRIM(activity_detail), fund_code) IN (${valuesClause})
             GROUP BY gl_code, TRIM(activity_detail), fund_code`,
            valuesParams
          ),
        ]);

        for (const r of poSpent.rows) {
          const key = `${r.gl_code}|${r.activity_detail}|${r.fund_code}`;
          const entry = spentMap.get(key) || { po: 0, voucher: 0, acr: 0 };
          entry.po = parseFloat(r.total);
          spentMap.set(key, entry);
        }
        for (const r of voucherSpent.rows) {
          const key = `${r.gl_code}|${r.activity_detail}|${r.fund_code}`;
          const entry = spentMap.get(key) || { po: 0, voucher: 0, acr: 0 };
          entry.voucher = parseFloat(r.total);
          spentMap.set(key, entry);
        }
        for (const r of acrSpent.rows) {
          const key = `${r.gl_code}|${r.activity_detail}|${r.fund_code}`;
          const entry = spentMap.get(key) || { po: 0, voucher: 0, acr: 0 };
          entry.acr = parseFloat(r.total);
          spentMap.set(key, entry);
        }

        // Budget controls: credit side adds, debit side subtracts (matched on GL + activity + fund)
        const [bcCredits, bcDebits] = await Promise.all([
          query<{ cr_gl_code: string; cr_activity: string; cr_fund: string; total: string }>(
            `SELECT cr_gl_code, TRIM(cr_activity) as cr_activity, cr_fund, COALESCE(SUM(amount), 0) as total
             FROM budget_controls
             WHERE (cr_gl_code, TRIM(cr_activity), cr_fund) IN (${valuesClause})
             GROUP BY cr_gl_code, TRIM(cr_activity), cr_fund`,
            valuesParams
          ),
          query<{ dr_gl_code: string; dr_activity: string; dr_fund: string; total: string }>(
            `SELECT dr_gl_code, TRIM(dr_activity) as dr_activity, dr_fund, COALESCE(SUM(amount), 0) as total
             FROM budget_controls
             WHERE (dr_gl_code, TRIM(dr_activity), dr_fund) IN (${valuesClause})
             GROUP BY dr_gl_code, TRIM(dr_activity), dr_fund`,
            valuesParams
          ),
        ]);

        for (const r of bcCredits.rows) {
          const key = `${r.cr_gl_code}|${r.cr_activity}|${r.cr_fund}`;
          bcMap.set(key, (bcMap.get(key) || 0) + parseFloat(r.total));
        }
        for (const r of bcDebits.rows) {
          const key = `${r.dr_gl_code}|${r.dr_activity}|${r.dr_fund}`;
          bcMap.set(key, (bcMap.get(key) || 0) - parseFloat(r.total));
        }
      }

      // Compute filtered totals across ALL filtered items (not just current page)
      const filteredKeys = `SELECT DISTINCT gl_code, TRIM(activity_detail), fund FROM budget_items ${where}`;
      const [bcCreditResult, bcDebitResult, poTotalResult, voucherTotalResult, acrTotalResult] = await Promise.all([
        query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM budget_controls
           WHERE (TRIM(cr_activity), cr_gl_code, cr_fund) IN (SELECT DISTINCT TRIM(activity_detail), gl_code, fund FROM budget_items ${where})`,
          params
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) as total FROM budget_controls
           WHERE (TRIM(dr_activity), dr_gl_code, dr_fund) IN (SELECT DISTINCT TRIM(activity_detail), gl_code, fund FROM budget_items ${where})`,
          params
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(total), 0) as total FROM po_reports
           WHERE cancelled != 'Yes' AND po_full IS NOT NULL AND po_full != ''
             AND (gl_code, TRIM(activity_detail), fund_code) IN (${filteredKeys})`,
          params
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(total), 0) as total FROM voucher_reports vr
           WHERE vr.cancelled != 'Yes'
             AND vr.voucher_type = 'Other'
             AND (vr.po IS NULL OR vr.po = '' OR vr.po = '-'
               OR vr.po NOT IN (SELECT po_full FROM po_reports pr WHERE pr.po_full IS NOT NULL AND pr.po_full != '' AND pr.cancelled != 'Yes'
                 AND TRIM(pr.activity_detail) = TRIM(vr.activity_detail) AND pr.gl_code = vr.gl_code AND pr.fund_code = vr.fund_code))
             AND (vr.gl_code, TRIM(vr.activity_detail), vr.fund_code) IN (${filteredKeys})`,
          params
        ),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(total), 0) as total FROM acr_reports
           WHERE cancelled != 'Yes'
             AND (gl_code, TRIM(activity_detail), fund_code) IN (${filteredKeys})`,
          params
        ),
      ]);
      const filteredBcNet =
        (parseFloat(bcCreditResult.rows[0].total) || 0) -
        (parseFloat(bcDebitResult.rows[0].total) || 0);

      const rows = itemsResult.rows.map((r) => {
        const row = r as Record<string, unknown>;
        const trimmedActivity = String(row.activity_detail || "").trim();
        const key = `${row.gl_code}|${trimmedActivity}|${row.fund}`;
        const spent = spentMap.get(key) || { po: 0, voucher: 0, acr: 0 };
        return {
          ...r,
          po_spent: spent.po,
          voucher_spent: spent.voucher,
          acr_spent: spent.acr,
          budget_control: bcMap.get(key) || 0,
        };
      });

      const effectiveLimit = showAll ? count : limit;
      const approvedBudget = parseFloat(sumResult.rows[0].total);

      const filteredSpent =
        (parseFloat(poTotalResult.rows[0].total) || 0) +
        (parseFloat(voucherTotalResult.rows[0].total) || 0);
      const filteredAcr = parseFloat(acrTotalResult.rows[0].total) || 0;

      return {
        items: rows,
        total: count,
        totalBudget: approvedBudget + filteredBcNet,
        filteredSpent,
        filteredAcr,
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
    const sectionParam = searchParams.get("section") || "";
    const sections = sectionParam ? sectionParam.split(",").filter(Boolean) : [];
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    // Fetch filters, summary, and list data ALL in parallel
    const [filters, summary, list] = await Promise.all([
      fetchFilters(),
      fetchSummary(),
      fetchList(search, fund, center, sections, page, limit, offset),
    ]);

    logger.info("Budget data fetched", { search, fund, center, sections, page });

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
