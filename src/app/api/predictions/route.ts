import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { currentPlayer } from "@/lib/session";
import { isLocked, scoreGroupPrediction } from "@/lib/scoring";
import { Match, Prediction, Result } from "@/lib/types";

const PICKS: Result[] = ["home", "draw", "away"];

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { match_id } = body;
  const pick: Result | null = PICKS.includes(body.pick) ? body.pick : null;
  if (!match_id || !pick) return NextResponse.json({ error: "Pick home, draw, or away." }, { status: 400 });

  const db = admin();
  const { data: match } = await db.from("matches").select("*").eq("id", match_id).maybeSingle();
  if (!match) return NextResponse.json({ error: "Unknown match." }, { status: 404 });
  if ((match as Match).stage !== "group") {
    return NextResponse.json({ error: "Only group matches are picked here." }, { status: 400 });
  }
  if (isLocked((match as Match).kickoff)) {
    return NextResponse.json({ error: "This match has kicked off — picks are locked." }, { status: 423 });
  }

  const prediction: Prediction = { player_id: player.id, match_id, pick, points: 0 };
  prediction.points = scoreGroupPrediction(prediction, match as Match);

  const { error } = await db
    .from("predictions")
    .upsert({ ...prediction, updated_at: new Date().toISOString() }, { onConflict: "player_id,match_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
