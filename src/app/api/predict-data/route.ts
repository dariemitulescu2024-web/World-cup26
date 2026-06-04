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
  const settings = await getSettings();
  const { data: matchesRaw } = await db
    .from("matches")
    .select("*")
    .order("kickoff", { ascending: true })
    .order("match_no", { ascending: true });
  const { data: predsRaw } = await db
    .from("predictions")
    .select("*")
    .eq("player_id", player.id);

  const now = new Date();
  const matches = (matchesRaw ?? []).map((m: Match) => ({
    ...m,
    locked: isLocked(m.kickoff, now),
  }));

  const preds: Record<string, Prediction> = {};
  for (const p of (predsRaw ?? []) as Prediction[]) preds[p.match_id] = p;

  // Wildcard usage so the UI can show "2 of 3 left".
  const stageById: Record<string, string> = {};
  for (const m of matches) stageById[m.id] = m.stage;
  let doublesUsed = 0;
  for (const p of Object.values(preds)) {
    if (p.wildcard === "double" && stageById[p.match_id] === "group") doublesUsed++;
  }

  return NextResponse.json({
    player: { id: player.id, name: player.name },
    matches,
    predictions: preds,
    scoring: settings.scoring,
    wildcards: {
      doublesUsed,
      doublesMax: settings.scoring.groupWildcards,
    },
  });
}
