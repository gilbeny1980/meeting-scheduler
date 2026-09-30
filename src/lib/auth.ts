import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

export const adminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

function secret(): string {
  return process.env.SESSION_SECRET || `fallback:${process.env.ADMIN_PASSWORD ?? ""}`;
}

function token(): string {
  return createHmac("sha256", secret()).update("admin-session-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && safeEqual(password, expected!);
}

export function sessionValue(): string {
  return token();
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, token());
}
