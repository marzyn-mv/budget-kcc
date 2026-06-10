import { NextRequest, NextResponse } from "next/server";
import getDb, { addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    const uploads = db
      .prepare(
        `SELECT
          uh.*,
          (SELECT COUNT(*) FROM budget_items WHERE upload_id = uh.id) as linked_items,
          (SELECT COUNT(*) FROM logs WHERE action = 'upload' AND details LIKE '%' || uh.filename || '%' AND created_at >= uh.uploaded_at) as related_logs
        FROM upload_history uh
        ORDER BY uh.uploaded_at DESC`
      )
      .all();

    return NextResponse.json({ uploads });
  } catch (error) {
    logger.error("Failed to fetch upload history", { error });
    return NextResponse.json(
      { error: "Failed to fetch upload history" },
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
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const db = getDb();

    const upload = db
      .prepare("SELECT * FROM upload_history WHERE id = ?")
      .get(id) as { id: number; filename: string; rows_imported: number } | undefined;

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Count related budget items before deleting
    const countRow = db
      .prepare("SELECT COUNT(*) as count FROM budget_items WHERE upload_id = ?")
      .get(id) as { count: number };

    // Delete related budget items and the upload record in a transaction
    const deleteAll = db.transaction(() => {
      db.prepare("DELETE FROM budget_items WHERE upload_id = ?").run(id);
      db.prepare("DELETE FROM upload_history WHERE id = ?").run(id);
    });
    deleteAll();

    logger.info("Upload and related data deleted", {
      id,
      filename: upload.filename,
      budgetItemsDeleted: countRow.count,
    });
    addLog(
      "info",
      "upload_delete",
      `Deleted upload #${id}: ${upload.filename} (${countRow.count} budget items removed)`
    );

    return NextResponse.json({
      message: "Deleted successfully",
      budgetItemsDeleted: countRow.count,
    });
  } catch (error) {
    logger.error("Failed to delete upload history", { error });
    addLog("error", "upload_history_delete_failed", String(error));
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
