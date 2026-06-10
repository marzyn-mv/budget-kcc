import { NextRequest, NextResponse } from "next/server";
import { sql, query } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const level = searchParams.get("level") || "";
    const offset = (page - 1) * limit;

    let countResult;
    let logsResult;

    if (level) {
      countResult = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM logs WHERE level = $1",
        [level]
      );
      logsResult = await query(
        "SELECT * FROM logs WHERE level = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3",
        [level, limit, offset]
      );
    } else {
      countResult = await query<{ count: string }>(
        "SELECT COUNT(*) as count FROM logs"
      );
      logsResult = await query(
        "SELECT * FROM logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
    }

    const count = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      logs: logsResult.rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
