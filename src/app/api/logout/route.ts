import { NextResponse } from "next/server";
import { PLAYER_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLAYER_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
