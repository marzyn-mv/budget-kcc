import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getCached } from "@/lib/cache";
import logger from "@/lib/logger";

/** GL code classification by first 3 digits — from GL_Code_Classification_Reference */
const GL_CLASSIFICATIONS: Record<string, string> = {
  "211": "Salaries and Overtime",
  "212": "Employee Allowances and Other Payments",
  "213": "Pensions and Retirement Benefits",
  "221": "Travel Expenses",
  "222": "Office Supplies and Consumables",
  "223": "Operating Services and Utilities",
  "224": "Operational Supplies and Consumables",
  "225": "Training and Human Resource Development",
  "226": "Repairs and Maintenance",
  "227": "Interest and Debt Service Charges",
  "228": "Subsidies, Grants and Financial Assistance",
  "281": "Losses and Compensation",
  "291": "Economic Development Projects and Activities",
  "292": "Budget Contingency",
  "295": "Transfers to the Sovereign Development Fund",
  "421": "Land and Buildings",
  "422": "Infrastructure Development",
  "423": "Furniture, Equipment, Software and Other Assets",
  "424": "Vehicles and Transport Assets",
  "441": "Domestic Equity Investments and Capital Contributions",
  "442": "Overseas Equity Investments",
  "451": "Building Alterations and Improvements",
  "721": "Short-Term Domestic Loan Repayments",
  "722": "Short-Term Foreign Loan Repayments",
  "723": "Long-Term Domestic Loan Repayments",
  "725": "Long-Term Foreign Loan Repayments",
  "731": "Domestic Loans Granted",
  "732": "Foreign Loans Granted",
};

async function fetchReportData() {
  return getCached(
    "reports:all",
    async () => {
      const [
        totalResult,
        spentResult,
        byFundResult,
        bySectionResult,
        byCenterResult,
        byGlResult,
        poByFundResult,
        pvByFundResult,
      ] = await Promise.all([
        // Total budget
        sql`
          SELECT COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items
        `,
        // Spending totals (PO + other PV + ACR)
        sql`
          SELECT
            COALESCE((SELECT SUM(total) FROM po_reports WHERE cancelled != 'Yes' AND po_full IS NOT NULL AND po_full != ''), 0) as po_total,
            COALESCE((SELECT SUM(total) FROM voucher_reports vr WHERE vr.cancelled != 'Yes'
              AND (vr.po IS NULL OR vr.po = '' OR vr.po = '-'
                OR vr.po NOT IN (SELECT po_full FROM po_reports pr WHERE pr.po_full IS NOT NULL AND pr.po_full != '' AND pr.cancelled != 'Yes'
                  AND pr.gl_code = vr.gl_code AND pr.activity_detail = vr.activity_detail AND pr.fund_code = vr.fund_code))
            ), 0) as other_pv_total,
            COALESCE((SELECT SUM(total) FROM acr_reports WHERE cancelled != 'Yes'), 0) as total_acr
        `,
        // By Fund
        sql`
          SELECT fund, COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY fund ORDER BY total DESC
        `,
        // By Section
        sql`
          SELECT section, COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items WHERE section != '' GROUP BY section ORDER BY total DESC
        `,
        // By Center (top 10)
        sql`
          SELECT center_name as center, COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items GROUP BY center_name ORDER BY total DESC LIMIT 10
        `,
        // Budget by GL classification (first 3 digits)
        sql`
          SELECT LEFT(gl_code, 3) as gl_class,
            COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
          FROM budget_items
          WHERE gl_code != ''
          GROUP BY LEFT(gl_code, 3) ORDER BY total DESC
        `,
        // PO spent by fund
        sql`
          SELECT fund_code as fund, COALESCE(SUM(total), 0) as total
          FROM po_reports
          WHERE cancelled != 'Yes' AND po_full IS NOT NULL AND po_full != ''
          GROUP BY fund_code ORDER BY fund_code
        `,
        // Other PV spent by fund
        sql`
          SELECT fund_code as fund, COALESCE(SUM(total), 0) as total
          FROM voucher_reports vr
          WHERE vr.cancelled != 'Yes'
            AND (vr.po IS NULL OR vr.po = '' OR vr.po = '-'
              OR vr.po NOT IN (SELECT po_full FROM po_reports pr WHERE pr.po_full IS NOT NULL AND pr.po_full != '' AND pr.cancelled != 'Yes'
                AND pr.gl_code = vr.gl_code AND pr.activity_detail = vr.activity_detail AND pr.fund_code = vr.fund_code))
          GROUP BY fund_code ORDER BY fund_code
        `,
      ]);

      const totalBudget = parseFloat(totalResult.rows[0].total);
      const poTotal = parseFloat(spentResult.rows[0].po_total) || 0;
      const otherPvTotal = parseFloat(spentResult.rows[0].other_pv_total) || 0;
      const totalAcr = parseFloat(spentResult.rows[0].total_acr) || 0;
      const totalSpent = poTotal + otherPvTotal;

      const byFund = byFundResult.rows.map((r) => ({
        fund: r.fund,
        budget: parseFloat(r.total),
      }));

      return {
        summary: {
          totalBudget,
          totalSpent,
          totalRemaining: totalBudget - totalSpent,
          totalAcr,
          poTotal,
          otherPvTotal,
        },
        byFund,
        bySection: bySectionResult.rows.map((r) => ({
          section: r.section,
          budget: parseFloat(r.total),
        })),
        byCenter: byCenterResult.rows.map((r) => ({
          center: r.center,
          budget: parseFloat(r.total),
        })),
        byClassification: byGlResult.rows.map((r) => ({
          code: r.gl_class,
          name: GL_CLASSIFICATIONS[r.gl_class] || `Unknown (${r.gl_class})`,
          budget: parseFloat(r.total),
        })),
        spentByFund: byFund.map((f) => {
          const po = poByFundResult.rows.find((r) => r.fund === f.fund);
          const pv = pvByFundResult.rows.find((r) => r.fund === f.fund);
          return {
            fund: f.fund,
            poSpent: po ? parseFloat(po.total) || 0 : 0,
            pvSpent: pv ? parseFloat(pv.total) || 0 : 0,
          };
        }),
      };
    },
    300
  );
}

export async function GET() {
  try {
    const data = await fetchReportData();
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to fetch report data", { error });
    return NextResponse.json(
      { error: "Failed to fetch report data" },
      { status: 500 }
    );
  }
}
