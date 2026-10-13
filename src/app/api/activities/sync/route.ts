import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { invalidateCache } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Update budget_items.section by matching activity_detail with activities table
    // Use LOWER + TRIM + collapse internal whitespace for robust matching
    const result = await query(
      `UPDATE budget_items bi
       SET section = a.section, updated_at = NOW()
       FROM activities a
       WHERE LOWER(REGEXP_REPLACE(TRIM(bi.activity_detail), '\\s+', ' ', 'g'))
           = LOWER(REGEXP_REPLACE(TRIM(a.activity_detail), '\\s+', ' ', 'g'))
         AND LOWER(TRIM(bi.fund)) = LOWER(TRIM(a.fund))
         AND a.section IS NOT NULL AND a.section != ''
         AND (bi.section IS NULL OR bi.section = '' OR bi.section != a.section)`
    );

    const updated = result.rowCount || 0;

    // Also update prog (activity number) from activities
    const progResult = await query(
      `UPDATE budget_items bi
       SET prog = a.activity_number, updated_at = NOW()
       FROM activities a
       WHERE LOWER(REGEXP_REPLACE(TRIM(bi.activity_detail), '\\s+', ' ', 'g'))
           = LOWER(REGEXP_REPLACE(TRIM(a.activity_detail), '\\s+', ' ', 'g'))
         AND LOWER(TRIM(bi.fund)) = LOWER(TRIM(a.fund))
         AND a.activity_number IS NOT NULL AND a.activity_number != ''
         AND (bi.prog IS NULL OR bi.prog = '' OR bi.prog != a.activity_number)`
    );

    const progUpdated = progResult.rowCount || 0;

    // Count unmatched budget items (no corresponding activity)
    const unmatchedResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM budget_items bi
       WHERE NOT EXISTS (
         SELECT 1 FROM activities a
         WHERE LOWER(REGEXP_REPLACE(TRIM(bi.activity_detail), '\\s+', ' ', 'g'))
             = LOWER(REGEXP_REPLACE(TRIM(a.activity_detail), '\\s+', ' ', 'g'))
           AND LOWER(TRIM(bi.fund)) = LOWER(TRIM(a.fund))
       )`
    );
    const unmatched = parseInt(unmatchedResult.rows[0].count);

    // Invalidate all budget caches (filters, summary, and list pages)
    await invalidateCache("budget:*");

    await addLog(
      "info",
      "activity_sync",
      `Synced sections: ${updated} rows updated, activity numbers: ${progUpdated} rows updated, unmatched: ${unmatched}`
    );

    return NextResponse.json({
      message: `Sections: ${updated} updated, Activity No: ${progUpdated} updated${unmatched > 0 ? `, ${unmatched} budget items unmatched` : ""}`,
      sectionsUpdated: updated,
      progUpdated,
      unmatched,
    });
  } catch (err) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: "Failed to sync sections" }, { status: 500 });
  }
}
