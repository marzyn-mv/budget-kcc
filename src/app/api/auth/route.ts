import { NextRequest, NextResponse } from "next/server";
import { verifyAccessCode, getSessionToken, verifySession } from "@/lib/auth";
import { addLog } from "@/lib/db";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { accessCode } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!verifyAccessCode(accessCode)) {
      logger.warn("Failed login attempt", { ip });
      await addLog("warn", "login_failed", `Failed login from ${ip}`, ip);
      return NextResponse.json(
        { error: "Invalid access code" },
        { status: 401 }
      );
    }

    const token = getSessionToken();
    logger.info("Admin login successful", { ip });
    await addLog("info", "login_success", `Admin logged in from ${ip}`, ip);

    const response = NextResponse.json({ message: "Authenticated" });
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (error) {
    logger.error("Auth error", { error });
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value || null;
  return NextResponse.json({ authenticated: verifySession(token) });
}

export async function DELETE() {
  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  await addLog("info", "logout", "Admin logged out");
  return response;
}
