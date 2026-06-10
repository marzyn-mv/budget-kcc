import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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

    const db = getDb();

    const where = level ? "WHERE level = ?" : "";
    const params = level ? [level] : [];

    const countRow = db
      .prepare(`SELECT COUNT(*) as count FROM logs ${where}`)
      .get(...params) as { count: number };

    const logs = db
      .prepare(
        `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    return NextResponse.json({
      logs,
      total: countRow.count,
      page,
      totalPages: Math.ceil(countRow.count / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
