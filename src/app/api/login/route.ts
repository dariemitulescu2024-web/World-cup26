import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { pinHash, PLAYER_COOKIE } from "@/lib/session";

const PIN_RE = /^\d{4}$/;

export async function POST(req: NextRequest) {
  const { name, pin } = await req.json().catch(() => ({}));
  const trimmed = (name ?? "").toString().trim();
  if (!trimmed || !PIN_RE.test((pin ?? "").toString())) {
    return NextResponse.json({ error: "Enter your name and 4-digit PIN." }, { status: 400 });
  }

  const db = admin();
  const { data: player } = await db
    .from("players")
    .select("*")
    .ilike("name", trimmed)
    .maybeSingle();

  if (!player) {
    return NextResponse.json(
      { error: "No account with that name — switch to Create account." },
      { status: 404 },
    );
  }
  if (!player.pin_hash || player.pin_hash !== pinHash(player.name, pin)) {
    return NextResponse.json({ error: "Wrong PIN." }, { status: 403 });
  }

  const res = NextResponse.json({ name: player.name });
  res.cookies.set(PLAYER_COOKIE, player.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
