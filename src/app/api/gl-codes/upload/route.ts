import { NextRequest, NextResponse } from "next/server";
import { query, addLog, getPool } from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    // Parse header
    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"/, "").replace(/"$/, ""));
    const glIdx = header.indexOf("gl_code");
    const enIdx = header.indexOf("name_en");
    const dvIdx = header.indexOf("name_dv");
    const detIdx = header.indexOf("details");

    if (glIdx === -1) {
      return NextResponse.json(
        { error: "CSV must have a 'gl_code' column. Expected columns: gl_code, name_en, name_dv, details" },
        { status: 400 }
      );
    }

    // Parse rows
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const parsed = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const glCode = (cols[glIdx] || "").trim();
      if (!glCode) {
        errors.push(`Row ${i + 1}: missing gl_code, skipped`);
        continue;
      }
      parsed.push({
        gl_code: glCode,
        name_en: (enIdx >= 0 ? cols[enIdx] || "" : "").trim(),
        name_dv: (dvIdx >= 0 ? cols[dvIdx] || "" : "").trim(),
        details: (detIdx >= 0 ? cols[detIdx] || "" : "").trim(),
      });
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
    }

    // Check for duplicates against existing records
    const existingResult = await query<{ gl_code: string }>(`SELECT gl_code FROM gl_codes`);
    const existingKeys = new Set(existingResult.rows.map((r) => r.gl_code));

    const newRows = parsed.filter((r) => !existingKeys.has(r.gl_code));
    const skippedCount = parsed.length - newRows.length;

    if (newRows.length === 0) {
      return NextResponse.json(
        { error: "All GL codes already exist. No new data was imported.", skipped: skippedCount },
        { status: 409 }
      );
    }

    // Batch insert
    const pool = await getPool();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const BATCH_SIZE = 50;
      for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
        const batch = newRows.slice(i, i + BATCH_SIZE);
        const placeholders: string[] = [];
        const params: string[] = [];

        batch.forEach((row, idx) => {
          const base = idx * 4;
          placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
          params.push(row.gl_code, row.name_en, row.name_dv, row.details);
        });

        await client.query(
          `INSERT INTO gl_codes (gl_code, name_en, name_dv, details) VALUES ${placeholders.join(", ")}
           ON CONFLICT (gl_code) DO NOTHING`,
          params
        );
      }

      await client.query("COMMIT");
    } catch (txError) {
      await client.query("ROLLBACK");
      throw txError;
    } finally {
      client.release();
    }

    await addLog("info", "gl_code_bulk_upload", `Bulk uploaded ${newRows.length} GL codes from ${file.name}`);

    return NextResponse.json({
      message: skippedCount > 0
        ? `${newRows.length} GL codes imported. ${skippedCount} duplicates skipped.`
        : `${newRows.length} GL codes imported successfully.`,
      imported: newRows.length,
      skipped: skippedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return NextResponse.json({ error: "Bulk upload failed" }, { status: 500 });
  }
}
