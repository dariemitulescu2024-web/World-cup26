import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminHash } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not configured on the server." }, { status: 500 });
  }
  if ((password ?? "") !== expected) {
    return NextResponse.json({ error: "Wrong password." }, { status: 403 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminHash(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
