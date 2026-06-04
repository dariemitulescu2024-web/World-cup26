import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { getSettings } from "@/lib/recompute";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ admin: false }, { status: 401 });
  const settings = await getSettings();
  const db = admin();
  const { data: matches } = await db
    .from("matches")
    .select("*")
    .eq("stage", "group")
    .order("match_no", { ascending: true });
  const { data: teams } = await db
    .from("teams")
    .select("*")
    .order("champ_base", { ascending: true });
  const { count } = await db.from("players").select("*", { count: "exact", head: true });
  return NextResponse.json({
    admin: true,
    settings: {
      join_code: settings.join_code,
      tournament_locked: settings.tournament_locked,
      golden_boot_result: settings.golden_boot_result,
      odds_locked_at: settings.odds_locked_at,
    },
    matches: matches ?? [],
    teams: teams ?? [],
    players: count ?? 0,
  });
}
