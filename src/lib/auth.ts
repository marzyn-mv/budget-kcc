const ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || "council2026";

export function verifyAccessCode(code: string): boolean {
  return code === ACCESS_CODE;
}

export function getSessionToken(): string {
  return Buffer.from(`${ACCESS_CODE}-${Date.now()}`).toString("base64");
}

export function verifySession(token: string | null): boolean {
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    return decoded.startsWith(ACCESS_CODE + "-");
  } catch {
    return false;
  }
}
