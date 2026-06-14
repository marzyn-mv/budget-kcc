import { NextRequest, NextResponse } from "next/server";
import { query, addLog, getPool } from "@/lib/db";
import { getCached, invalidateCache } from "@/lib/cache";
import { verifySession } from "@/lib/auth";
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
    const showAll = limit <= 0;
    const [countSumResult, items] = await Promise.all([
      query<{ count: string; total: string }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ${table} ${where}`,
        params
      ),
      showAll
        ? query(
            `SELECT * FROM ${table} ${where} ORDER BY id ASC`,
            params
          )
        : query(
            `SELECT * FROM ${table} ${where} ORDER BY id ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
          ),
    ]);

    const count = parseInt(countSumResult.rows[0].count);
    const effectiveLimit = showAll ? count : limit;

    return NextResponse.json({
      items: items.rows,
      total: count,
      totalAmount: parseFloat(countSumResult.rows[0].total),
      page: showAll ? 1 : page,
      limit: effectiveLimit,
      totalPages: showAll ? 1 : Math.ceil(count / limit),
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

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { type, ids } = await req.json();
    if (!type || !["po-report", "voucher-report"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const table = type === "voucher-report" ? "voucher_reports" : "po_reports";
    const label = type === "voucher-report" ? "voucher" : "PO";
    const deleteByIds = Array.isArray(ids) && ids.length > 0;

    if (deleteByIds) {
      const numericIds = ids.filter((id: unknown) => typeof id === "number" && Number.isInteger(id));
      if (numericIds.length === 0) {
        return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
      }

      const placeholders = numericIds.map((_: number, i: number) => `$${i + 1}`).join(", ");
      await query(`DELETE FROM ${table} WHERE id IN (${placeholders})`, numericIds);

      await invalidateCache("budget:*", "expense:*", "uploads:*");

      logger.info(`${numericIds.length} ${label} reports deleted`, { ids: numericIds });
      await addLog(
        "info",
        "expense_delete_selected",
        `Deleted ${numericIds.length} selected ${label} reports`
      );

      return NextResponse.json({
        message: `Deleted ${numericIds.length} ${label} reports`,
        deleted: numericIds.length,
      });
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${table}`
    );
    const count = parseInt(countResult.rows[0].count);

    if (count === 0) {
      return NextResponse.json({ message: "No records to delete", deleted: 0 });
    }

    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM ${table}`);
      await client.query(
        `DELETE FROM upload_history WHERE id IN (
          SELECT DISTINCT uh.id FROM upload_history uh
          LEFT JOIN budget_items bi ON bi.upload_id = uh.id
          LEFT JOIN po_reports po ON po.upload_id = uh.id
          LEFT JOIN voucher_reports vr ON vr.upload_id = uh.id
          WHERE bi.id IS NULL AND po.id IS NULL AND vr.id IS NULL
        )`
      );
      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await invalidateCache("budget:*", "expense:*", "uploads:*");

    logger.info(`All ${label} reports deleted`, { count });
    await addLog(
      "info",
      "expense_delete_all",
      `Deleted all ${count} ${label} reports`
    );

    return NextResponse.json({
      message: `Deleted ${count} ${label} reports`,
      deleted: count,
    });
  } catch (error) {
    logger.error("Failed to delete expense data", { error });
    await addLog("error", "expense_delete", String(error));
    return NextResponse.json(
      { error: "Failed to delete expense data" },
      { status: 500 }
    );
  }
}
