import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { currentPlayer } from "@/lib/session";
import { getSettings } from "@/lib/recompute";

async function locked(): Promise<boolean> {
  const settings = await getSettings();
  if (settings.tournament_locked) return true;
  const { data } = await admin()
    .from("matches")
    .select("kickoff")
    .order("kickoff", { ascending: true })
    .limit(1)
    .maybeSingle();
  return !!data && new Date(data.kickoff).getTime() <= Date.now();
}

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });
  const db = admin();
  const { data: entry } = await db.from("entries").select("*").eq("player_id", player.id).maybeSingle();
  const { data: teams } = await db
    .from("teams")
    .select("name, champ_base")
    .order("champ_base", { ascending: true });
  return NextResponse.json({
    entry: entry ?? { champion: null, golden_boot: null, ride_teams: [] },
    teams: teams ?? [],
    locked: await locked(),
  });
}

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });
  if (await locked()) {
    return NextResponse.json({ error: "Picks are locked — the tournament has started." }, { status: 423 });
  }
  const body = await req.json().catch(() => ({}));
  const champion = (body.champion ?? "").toString().trim() || null;
  const golden_boot = (body.golden_boot ?? "").toString().trim() || null;
  const ride_teams: string[] = Array.isArray(body.ride_teams)
    ? body.ride_teams.map((s: unknown) => (s ?? "").toString().trim()).filter(Boolean).slice(0, 3)
    : [];

  const { error } = await admin()
    .from("entries")
    .upsert(
      { player_id: player.id, champion, golden_boot, ride_teams, updated_at: new Date().toISOString() },
      { onConflict: "player_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
