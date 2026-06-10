import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
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
    const db = getDb();

    const upload = db
      .prepare("SELECT * FROM upload_history WHERE id = ?")
      .get(id) as { filename: string; uploaded_at: string } | undefined;

    if (!upload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Find logs related to this upload by filename and time
    const logs = db
      .prepare(
        `SELECT * FROM logs
         WHERE (action LIKE '%upload%' OR action LIKE '%seed%')
           AND details LIKE ?
         ORDER BY created_at DESC`
      )
      .all(`%${upload.filename}%`);

    return NextResponse.json({ upload, logs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
