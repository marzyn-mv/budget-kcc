import { NextRequest, NextResponse } from "next/server";
import { sql, addLog, getPool } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";
import logger from "@/lib/logger";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sql`
      SELECT
        uh.*,
        (SELECT COUNT(*) FROM budget_items WHERE upload_id = uh.id) as linked_items,
        (SELECT COUNT(*) FROM po_reports WHERE upload_id = uh.id) as linked_pos,
        (SELECT COUNT(*) FROM voucher_reports WHERE upload_id = uh.id) as linked_vouchers,
        (SELECT COUNT(*) FROM logs WHERE action = 'upload' AND details LIKE '%' || uh.filename || '%' AND created_at >= uh.uploaded_at) as related_logs
      FROM upload_history uh
      ORDER BY uh.uploaded_at DESC
    `;

    return NextResponse.json({
      uploads: result.rows.map((r) => ({
        ...r,
        linked_items: parseInt(r.linked_items as string),
        linked_pos: parseInt(r.linked_pos as string),
        linked_vouchers: parseInt(r.linked_vouchers as string),
        related_logs: parseInt(r.related_logs as string),
      })),
    });
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

    const uploadResult = await sql`SELECT * FROM upload_history WHERE id = ${id}`;
    const upload = uploadResult.rows[0] as { id: number; filename: string; rows_imported: number } | undefined;

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [budgetCount, poCount, voucherCount] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM budget_items WHERE upload_id = ${id}`,
      sql`SELECT COUNT(*) as count FROM po_reports WHERE upload_id = ${id}`,
      sql`SELECT COUNT(*) as count FROM voucher_reports WHERE upload_id = ${id}`,
    ]);
    const budgetItemCount = parseInt(budgetCount.rows[0].count);
    const poItemCount = parseInt(poCount.rows[0].count);
    const voucherItemCount = parseInt(voucherCount.rows[0].count);

    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM budget_items WHERE upload_id = $1", [id]);
      await client.query("DELETE FROM po_reports WHERE upload_id = $1", [id]);
      await client.query("DELETE FROM voucher_reports WHERE upload_id = $1", [id]);
      await client.query("DELETE FROM upload_history WHERE id = $1", [id]);
      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await invalidateCache("budget:*", "uploads:*", "expense:*");

    const parts = [
      budgetItemCount > 0 ? `${budgetItemCount} budget items` : null,
      poItemCount > 0 ? `${poItemCount} PO reports` : null,
      voucherItemCount > 0 ? `${voucherItemCount} voucher reports` : null,
    ].filter(Boolean).join(", ");

    logger.info("Upload and related data deleted", {
      id,
      filename: upload.filename,
      budgetItemsDeleted: budgetItemCount,
      poReportsDeleted: poItemCount,
      voucherReportsDeleted: voucherItemCount,
    });
    await addLog(
      "info",
      "upload_delete",
      `Deleted upload #${id}: ${upload.filename} (${parts || "no linked data"})`
    );

    return NextResponse.json({
      message: "Deleted successfully",
      budgetItemsDeleted: budgetItemCount,
      poReportsDeleted: poItemCount,
      voucherReportsDeleted: voucherItemCount,
    });
  } catch (error) {
    logger.error("Failed to delete upload history", { error });
    await addLog("error", "upload_history_delete_failed", String(error));
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}
