import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/recompute";
import { newToken, pinHash, PLAYER_COOKIE } from "@/lib/session";

const PIN_RE = /^\d{4}$/;

export async function POST(req: NextRequest) {
  const { name, pin, code } = await req.json().catch(() => ({}));
  const trimmed = (name ?? "").toString().trim();
  if (!trimmed) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (trimmed.length > 40) return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  if (!PIN_RE.test((pin ?? "").toString())) {
    return NextResponse.json({ error: "Your PIN must be exactly 4 digits." }, { status: 400 });
  }

  const settings = await getSettings();
  if ((code ?? "").toString().trim().toLowerCase() !== settings.join_code.toLowerCase()) {
    return NextResponse.json({ error: "Wrong join code." }, { status: 403 });
  }

  const db = admin();
  const { data: existing } = await db.from("players").select("id").ilike("name", trimmed).maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "That name is taken — switch to Log in and use your PIN." },
      { status: 409 },
    );
  }

  const token = newToken();
  const { data: created, error } = await db
    .from("players")
    .insert({ name: trimmed, token, pin_hash: pinHash(trimmed, pin) })
    .select()
    .single();
  if (error || !created) {
    return NextResponse.json({ error: "Could not create your account — try again." }, { status: 500 });
  }

  const res = NextResponse.json({ name: created.name });
  res.cookies.set(PLAYER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
