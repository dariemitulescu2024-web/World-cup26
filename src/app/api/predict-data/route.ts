import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { currentPlayer } from "@/lib/session";
import { getSettings } from "@/lib/recompute";
import { isLocked } from "@/lib/scoring";
import { Match, Prediction } from "@/lib/types";

export async function GET() {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });

  const db = admin();
  const { data: matchesRaw } = await db
    .from("matches")
    .select("*")
    .eq("stage", "group")
    .order("kickoff", { ascending: true })
    .order("match_no", { ascending: true });
  const { data: predsRaw } = await db
    .from("predictions")
    .select("*")
    .eq("player_id", player.id);

  const now = new Date();
  const matches = (matchesRaw ?? []).map((m: Match) => ({ ...m, locked: isLocked(m.kickoff, now) }));
  const predictions: Record<string, Prediction> = {};
  for (const p of (predsRaw ?? []) as Prediction[]) predictions[p.match_id] = p;

  const settings = await getSettings();
  return NextResponse.json({
    player: { id: player.id, name: player.name },
    matches,
    predictions,
    wildcardsMax: settings.scoring.wildcards,
  });
}
