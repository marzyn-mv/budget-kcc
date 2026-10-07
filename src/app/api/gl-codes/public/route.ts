import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let countResult, dataResult;
    if (search) {
      const pattern = `%${search}%`;
      countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM gl_codes WHERE gl_code ILIKE $1 OR name_en ILIKE $1 OR name_dv ILIKE $1`,
        [pattern]
      );
      dataResult = await query(
        `SELECT id, gl_code, name_en, name_dv, details FROM gl_codes WHERE gl_code ILIKE $1 OR name_en ILIKE $1 OR name_dv ILIKE $1 ORDER BY gl_code ASC LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      );
    } else {
      countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM gl_codes`);
      dataResult = await query(
        `SELECT id, gl_code, name_en, name_dv, details FROM gl_codes ORDER BY gl_code ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
    }

    const count = parseInt(countResult.rows[0].count);
    return NextResponse.json({
      glCodes: dataResult.rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch budget codes" }, { status: 500 });
  }
}
