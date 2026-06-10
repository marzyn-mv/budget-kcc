import { NextRequest, NextResponse } from "next/server";
import getDb, { addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import logger from "@/lib/logger";

export async function PUT(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    addLog("warn", "edit_unauthorized", "Unauthorized edit attempt");
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

    const db = getDb();

    const existing = db
      .prepare("SELECT * FROM budget_items WHERE id = ?")
      .get(id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    db.prepare(
      `UPDATE budget_items SET
        fund = COALESCE(?, fund),
        activity_detail = COALESCE(?, activity_detail),
        prog = COALESCE(?, prog),
        center_name = COALESCE(?, center_name),
        gl_code = COALESCE(?, gl_code),
        budget = COALESCE(?, budget),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(
      fund || null,
      activity_detail || null,
      prog || null,
      center_name || null,
      gl_code || null,
      budget || null,
      id
    );

    logger.info("Budget item edited", { id, changes: body });
    addLog("info", "edit", `Edited item #${id}: ${JSON.stringify(body)}`);

    const updated = db
      .prepare("SELECT * FROM budget_items WHERE id = ?")
      .get(id);
    return NextResponse.json({ message: "Updated successfully", item: updated });
  } catch (error) {
    logger.error("Edit failed", { error });
    addLog("error", "edit_failed", String(error));
    return NextResponse.json({ error: "Edit failed" }, { status: 500 });
  }
}
