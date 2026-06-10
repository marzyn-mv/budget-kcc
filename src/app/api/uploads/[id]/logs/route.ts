import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const uploadResult = await sql`SELECT * FROM upload_history WHERE id = ${id}`;
    const upload = uploadResult.rows[0] as { filename: string; uploaded_at: string } | undefined;

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const logsResult = await sql`
      SELECT * FROM logs
      WHERE (action LIKE '%upload%' OR action LIKE '%seed%')
        AND details LIKE ${'%' + upload.filename + '%'}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({ upload, logs: logsResult.rows });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
