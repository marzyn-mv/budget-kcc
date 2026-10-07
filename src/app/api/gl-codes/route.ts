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
        `SELECT g.*, s.name as section_name FROM gl_codes g LEFT JOIN sections s ON g.section_id = s.id WHERE g.gl_code ILIKE $1 OR g.name_en ILIKE $1 OR g.name_dv ILIKE $1 ORDER BY g.gl_code ASC LIMIT $2 OFFSET $3`,
        [pattern, limit, offset]
      );
    } else {
      countResult = await query<{ count: string }>(`SELECT COUNT(*) as count FROM gl_codes`);
      dataResult = await query(
        `SELECT g.*, s.name as section_name FROM gl_codes g LEFT JOIN sections s ON g.section_id = s.id ORDER BY g.gl_code ASC LIMIT $1 OFFSET $2`,
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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch GL codes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { gl_code, name_en, name_dv, details, section_id } = await req.json();
    if (!gl_code || !gl_code.trim()) {
      return NextResponse.json({ error: "GL Code is required" }, { status: 400 });
    }

    const existing = await query(`SELECT id FROM gl_codes WHERE gl_code = $1`, [gl_code.trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "GL Code already exists" }, { status: 409 });
    }

    await query(
      `INSERT INTO gl_codes (gl_code, name_en, name_dv, details, section_id) VALUES ($1, $2, $3, $4, $5)`,
      [gl_code.trim(), (name_en || "").trim(), (name_dv || "").trim(), (details || "").trim(), section_id || null]
    );

    await addLog("info", "gl_code_create", `Created GL code: ${gl_code}`);
    return NextResponse.json({ message: "GL code created" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create GL code" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, gl_code, name_en, name_dv, details, section_id } = await req.json();
    if (!id || !gl_code || !gl_code.trim()) {
      return NextResponse.json({ error: "ID and GL Code are required" }, { status: 400 });
    }

    const dup = await query(`SELECT id FROM gl_codes WHERE gl_code = $1 AND id != $2`, [gl_code.trim(), id]);
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "Another GL Code with this code already exists" }, { status: 409 });
    }

    await query(
      `UPDATE gl_codes SET gl_code = $1, name_en = $2, name_dv = $3, details = $4, section_id = $5, updated_at = NOW() WHERE id = $6`,
      [gl_code.trim(), (name_en || "").trim(), (name_dv || "").trim(), (details || "").trim(), section_id || null, id]
    );

    await addLog("info", "gl_code_update", `Updated GL code: ${gl_code}`);
    return NextResponse.json({ message: "GL code updated" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update GL code" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const item = await query(`SELECT gl_code FROM gl_codes WHERE id = $1`, [id]);
    if (item.rows.length === 0) {
      return NextResponse.json({ error: "GL code not found" }, { status: 404 });
    }

    await query(`DELETE FROM gl_codes WHERE id = $1`, [id]);
    await addLog("info", "gl_code_delete", `Deleted GL code: ${item.rows[0].gl_code}`);
    return NextResponse.json({ message: "GL code deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete GL code" }, { status: 500 });
  }
}
