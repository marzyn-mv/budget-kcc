import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`SELECT * FROM sections ORDER BY name ASC`);
    return NextResponse.json({ sections: result.rows });
  } catch {
    return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Section name is required" }, { status: 400 });
    }

    const existing = await query(`SELECT id FROM sections WHERE name = $1`, [name.trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Section already exists" }, { status: 409 });
    }

    await query(`INSERT INTO sections (name) VALUES ($1)`, [name.trim()]);
    await addLog("info", "section_create", `Created section: ${name.trim()}`);
    return NextResponse.json({ message: "Section created" });
  } catch {
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, name } = await req.json();
    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
    }

    const dup = await query(`SELECT id FROM sections WHERE name = $1 AND id != $2`, [name.trim(), id]);
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "Another section with this name already exists" }, { status: 409 });
    }

    await query(`UPDATE sections SET name = $1 WHERE id = $2`, [name.trim(), id]);
    await addLog("info", "section_update", `Updated section: ${name.trim()}`);
    return NextResponse.json({ message: "Section updated" });
  } catch {
    return NextResponse.json({ error: "Failed to update section" }, { status: 500 });
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

    const item = await query(`SELECT name FROM sections WHERE id = $1`, [id]);
    if (item.rows.length === 0) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    await query(`DELETE FROM sections WHERE id = $1`, [id]);
    await addLog("info", "section_delete", `Deleted section: ${item.rows[0].name}`);
    return NextResponse.json({ message: "Section deleted" });
  } catch {
    return NextResponse.json({ error: "Failed to delete section" }, { status: 500 });
  }
}
