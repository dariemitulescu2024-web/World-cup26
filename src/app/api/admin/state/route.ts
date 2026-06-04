import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { getSettings } from "@/lib/recompute";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ admin: false }, { status: 401 });
  const settings = await getSettings();
  const { data: matches } = await admin()
    .from("matches")
    .select("*")
    .order("match_no", { ascending: true });
  const { count } = await admin()
    .from("players")
    .select("*", { count: "exact", head: true });
  return NextResponse.json({ admin: true, settings, matches: matches ?? [], players: count ?? 0 });
}
