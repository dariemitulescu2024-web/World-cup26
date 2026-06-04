import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { currentPlayer } from "@/lib/session";
import { getSettings } from "@/lib/recompute";
import { ALL_TEAMS } from "@/lib/teams";

async function bonusLocked(): Promise<boolean> {
  const settings = await getSettings();
  if (settings.tournament_locked) return true;
  const { data } = await admin()
    .from("matches")
    .select("kickoff")
    .order("kickoff", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return false;
  return new Date(data.kickoff).getTime() <= Date.now();
}

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });
  const { data } = await admin()
    .from("bonus_predictions")
    .select("*")
    .eq("player_id", player.id)
    .maybeSingle();
  return NextResponse.json({
    bonus: data ?? { champion: null, golden_boot: null, semifinalists: [] },
    locked: await bonusLocked(),
    teams: ALL_TEAMS,
  });
}

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });
  if (await bonusLocked()) {
    return NextResponse.json({ error: "Bonus picks are locked — the tournament has started." }, { status: 423 });
  }
  const body = await req.json().catch(() => ({}));
  const champion = (body.champion ?? "").toString().trim() || null;
  const golden_boot = (body.golden_boot ?? "").toString().trim() || null;
  const semifinalists: string[] = Array.isArray(body.semifinalists)
    ? body.semifinalists.map((s: unknown) => (s ?? "").toString().trim()).filter(Boolean).slice(0, 4)
    : [];

  const { error } = await admin()
    .from("bonus_predictions")
    .upsert(
      { player_id: player.id, champion, golden_boot, semifinalists, updated_at: new Date().toISOString() },
      { onConflict: "player_id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
