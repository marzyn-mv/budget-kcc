import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const sectionFilter = searchParams.get("section") || "";
    const fundFilter = searchParams.get("fund") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (search) {
      conditions.push(`(activity_detail ILIKE $${paramIdx} OR activity_number ILIKE $${paramIdx})`);
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM activities ${where}`,
      params
    );

    const dataResult = await query(
      `SELECT * FROM activities ${where} ORDER BY activity_detail ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    const filtersResult = await query<{ section: string; fund: string }>(
      `SELECT DISTINCT section, fund FROM activities ORDER BY section, fund`
    );

    const sections = [...new Set(filtersResult.rows.map((r) => r.section).filter(Boolean))].sort();
    const funds = [...new Set(filtersResult.rows.map((r) => r.fund).filter(Boolean))].sort();

    const count = parseInt(countResult.rows[0].count);
    return NextResponse.json({
      activities: dataResult.rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
      filters: { sections, funds },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { activity_detail, activity_number, section, fund } = await req.json();
    if (!activity_detail?.trim()) {
      return NextResponse.json({ error: "Activity Detail is required" }, { status: 400 });
    }

    await query(
      `INSERT INTO activities (activity_detail, activity_number, section, fund) VALUES ($1, $2, $3, $4)`,
      [activity_detail.trim(), (activity_number || "").trim(), (section || "").trim(), (fund || "").trim()]
    );

    await addLog("info", "activity_create", `Created activity: ${activity_detail.trim()}`);
    return NextResponse.json({ message: "Activity created" });
  } catch {
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, activity_detail, activity_number, section, fund } = await req.json();
    if (!id || !activity_detail?.trim()) {
      return NextResponse.json({ error: "ID and Activity Detail are required" }, { status: 400 });
    }

    await query(
      `UPDATE activities SET activity_detail = $1, activity_number = $2, section = $3, fund = $4, updated_at = NOW() WHERE id = $5`,
      [activity_detail.trim(), (activity_number || "").trim(), (section || "").trim(), (fund || "").trim(), id]
    );

    await addLog("info", "activity_update", `Updated activity: ${activity_detail.trim()}`);
    return NextResponse.json({ message: "Activity updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, ids } = await req.json();

    if (ids && Array.isArray(ids) && ids.length > 0) {
      const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(",");
      await query(`DELETE FROM activities WHERE id IN (${placeholders})`, ids);
      await addLog("info", "activity_bulk_delete", `Deleted ${ids.length} activities`);
      return NextResponse.json({ message: `${ids.length} activities deleted` });
    }

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const item = await query(`SELECT activity_detail FROM activities WHERE id = $1`, [id]);
    if (item.rows.length === 0) {
      return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    }

    await query(`DELETE FROM activities WHERE id = $1`, [id]);
    await addLog("info", "activity_delete", `Deleted activity: ${item.rows[0].activity_detail}`);
    return NextResponse.json({ message: "Activity deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
