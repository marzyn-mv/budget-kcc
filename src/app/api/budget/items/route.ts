import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";

const FIELDS = ["fund", "activity_detail", "prog", "section", "center_name", "gl_code"] as const;

function isAuthorized(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  return verifySession(token);
}

function parseBudget(value: unknown): string | null {
  const n = parseFloat(String(value ?? "").replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n.toFixed(2) : null;
}

function readBody(body: Record<string, unknown>) {
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, String(body[f] ?? "").trim()])
  ) as Record<(typeof FIELDS)[number], string>;
  return { ...values, budget: parseBudget(body.budget) };
}

async function invalidateBudget() {
  await invalidateCache("budget:*");
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sectionFilter = searchParams.get("section") || "";
    const fundFilter = searchParams.get("fund") || "";
    const centerFilter = searchParams.get("center") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(
        `(activity_detail ILIKE $${paramIdx} OR prog ILIKE $${paramIdx} OR gl_code ILIKE $${paramIdx})`
      );
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (sectionFilter) {
      conditions.push(`section = $${paramIdx}`);
      params.push(sectionFilter);
      paramIdx++;
    }
    if (fundFilter) {
      conditions.push(`fund = $${paramIdx}`);
      params.push(fundFilter);
      paramIdx++;
    }
    if (centerFilter) {
      conditions.push(`center_name = $${paramIdx}`);
      params.push(centerFilter);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countResult, dataResult, filtersResult] = await Promise.all([
      query<{ count: string; total: string }>(
        `SELECT COUNT(*) as count,
                COALESCE(SUM(CAST(REPLACE(REPLACE(budget, ',', ''), ' ', '') AS NUMERIC)), 0) as total
         FROM budget_items ${where}`,
        params
      ),
      query(
        `SELECT * FROM budget_items ${where} ORDER BY id ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, limit, offset]
      ),
      query<{ section: string; fund: string; center_name: string }>(
        `SELECT DISTINCT section, fund, center_name FROM budget_items`
      ),
    ]);

    const distinct = (key: "section" | "fund" | "center_name") =>
      [...new Set(filtersResult.rows.map((r) => r[key]).filter(Boolean))].sort();

    const count = parseInt(countResult.rows[0].count);
    return NextResponse.json({
      items: dataResult.rows,
      total: count,
      totalBudget: parseFloat(countResult.rows[0].total) || 0,
      page,
      totalPages: Math.ceil(count / limit),
      filters: { sections: distinct("section"), funds: distinct("fund"), centers: distinct("center_name") },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch budget items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const item = readBody(await req.json());
    if (!item.activity_detail || !item.gl_code || !item.fund) {
      return NextResponse.json(
        { error: "Activity Detail, GL Code and Fund are required" },
        { status: 400 }
      );
    }
    if (item.budget === null) {
      return NextResponse.json({ error: "Budget must be a number" }, { status: 400 });
    }

    await query(
      `INSERT INTO budget_items (fund, activity_detail, prog, section, center_name, gl_code, budget)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [item.fund, item.activity_detail, item.prog, item.section, item.center_name, item.gl_code, item.budget]
    );

    await invalidateBudget();
    await addLog("info", "budget_item_create", `Created budget item: ${item.activity_detail} (${item.gl_code}, ${item.fund}) = ${item.budget}`);
    return NextResponse.json({ message: "Budget item created" });
  } catch {
    return NextResponse.json({ error: "Failed to create budget item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const item = readBody(body);
    if (!body.id || !item.activity_detail || !item.gl_code || !item.fund) {
      return NextResponse.json(
        { error: "ID, Activity Detail, GL Code and Fund are required" },
        { status: 400 }
      );
    }
    if (item.budget === null) {
      return NextResponse.json({ error: "Budget must be a number" }, { status: 400 });
    }

    const result = await query(
      `UPDATE budget_items SET fund = $1, activity_detail = $2, prog = $3, section = $4,
         center_name = $5, gl_code = $6, budget = $7, updated_at = NOW()
       WHERE id = $8`,
      [item.fund, item.activity_detail, item.prog, item.section, item.center_name, item.gl_code, item.budget, body.id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    await invalidateBudget();
    await addLog("info", "budget_item_update", `Updated budget item #${body.id}: ${JSON.stringify(item)}`);
    return NextResponse.json({ message: "Budget item updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update budget item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ids } = await req.json();

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(",");
      await query(`DELETE FROM budget_items WHERE id IN (${placeholders})`, ids);
      await invalidateBudget();
      await addLog("info", "budget_item_bulk_delete", `Deleted ${ids.length} budget items`);
      return NextResponse.json({ message: `${ids.length} budget items deleted` });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const item = await query<{ activity_detail: string; gl_code: string; fund: string; budget: string }>(
      `SELECT activity_detail, gl_code, fund, budget FROM budget_items WHERE id = $1`,
      [id]
    );
    if (item.rows.length === 0) {
      return NextResponse.json({ error: "Budget item not found" }, { status: 404 });
    }

    await query(`DELETE FROM budget_items WHERE id = $1`, [id]);
    await invalidateBudget();
    const r = item.rows[0];
    await addLog("info", "budget_item_delete", `Deleted budget item: ${r.activity_detail} (${r.gl_code}, ${r.fund}) = ${r.budget}`);
    return NextResponse.json({ message: "Budget item deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete budget item" }, { status: 500 });
  }
}
