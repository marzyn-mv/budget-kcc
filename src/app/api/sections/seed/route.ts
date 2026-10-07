import { NextRequest, NextResponse } from "next/server";
import { query, addLog } from "@/lib/db";
import { verifySession } from "@/lib/auth";

const EXISTING_SECTIONS = [
  "Admin",
  "Admin/Human Resource Unit",
  "Business Development",
  "Communication",
  "Council Reserve Fund",
  "Environment",
  "Finance",
  "Human Resource Unit",
  "I.T",
  "I.T/Bureau",
  "I.T/Communication",
  "I.T/Communication/Environment",
  "I.T/Human Resource Unit",
  "Legal",
  "Library",
  "Municipal",
  "PBA Ah Jamaakuran Jehey",
  "Projects",
  "Projects/Environment",
  "Social Service",
  "Sports and Civic",
  "Third Party Fund",
  "WDC",
  "Zakaath House Ah Jamaakuran Jehey",
];

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existingResult = await query<{ name: string }>(`SELECT name FROM sections`);
    const existingNames = new Set(existingResult.rows.map((r) => r.name));

    const toInsert = EXISTING_SECTIONS.filter((s) => !existingNames.has(s));

    if (toInsert.length === 0) {
      return NextResponse.json({ message: "All sections already exist", inserted: 0 });
    }

    for (const name of toInsert) {
      await query(`INSERT INTO sections (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name]);
    }

    await addLog("info", "sections_seed", `Seeded ${toInsert.length} sections`);
    return NextResponse.json({ message: `${toInsert.length} sections added`, inserted: toInsert.length });
  } catch {
    return NextResponse.json({ error: "Failed to seed sections" }, { status: 500 });
  }
}
