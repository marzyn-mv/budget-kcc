import { NextRequest, NextResponse } from "next/server";
import { sql, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import logger from "@/lib/logger";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    await addLog("warn", "edit_unauthorized", "Unauthorized edit attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, fund, activity_detail, prog, center_name, gl_code, budget } =
      body;

    if (!id) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    const existing = await sql`SELECT * FROM budget_items WHERE id = ${id}`;
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await sql`
      UPDATE budget_items SET
        fund = COALESCE(${fund || null}, fund),
        activity_detail = COALESCE(${activity_detail || null}, activity_detail),
        prog = COALESCE(${prog || null}, prog),
        center_name = COALESCE(${center_name || null}, center_name),
        gl_code = COALESCE(${gl_code || null}, gl_code),
        budget = COALESCE(${budget || null}, budget),
        updated_at = NOW()
      WHERE id = ${id}
    `;

    logger.info("Budget item edited", { id, changes: body });
    await addLog("info", "edit", `Edited item #${id}: ${JSON.stringify(body)}`);

    const updated = await sql`SELECT * FROM budget_items WHERE id = ${id}`;
    return NextResponse.json({ message: "Updated successfully", item: updated.rows[0] });
  } catch (error) {
    logger.error("Edit failed", { error });
    await addLog("error", "edit_failed", String(error));
    return NextResponse.json({ error: "Edit failed" }, { status: 500 });
  }
}
