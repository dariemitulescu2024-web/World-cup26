import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { currentPlayer } from "@/lib/session";
import { getSettings } from "@/lib/recompute";
import { isLocked, scorePrediction } from "@/lib/scoring";
import { Match, Prediction, Side, Wildcard } from "@/lib/types";

const SIDES: Side[] = ["home", "away", "none"];
const WILDCARDS: Wildcard[] = ["none", "double"];

export async function POST(req: NextRequest) {
  const player = await currentPlayer();
  if (!player) return NextResponse.json({ error: "Not joined" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { match_id } = body;
  const pred_home = Number(body.pred_home);
  const pred_away = Number(body.pred_away);
  const pred_first_team: Side | null = SIDES.includes(body.pred_first_team)
    ? body.pred_first_team
    : null;
  const wildcard: Wildcard = WILDCARDS.includes(body.wildcard) ? body.wildcard : "none";

  if (!match_id) return NextResponse.json({ error: "Missing match." }, { status: 400 });
  if (
    !Number.isInteger(pred_home) ||
    !Number.isInteger(pred_away) ||
    pred_home < 0 ||
    pred_away < 0 ||
    pred_home > 30 ||
    pred_away > 30
  ) {
    return NextResponse.json({ error: "Scores must be whole numbers 0–30." }, { status: 400 });
  }

  const db = admin();
  const { data: match } = await db.from("matches").select("*").eq("id", match_id).maybeSingle();
  if (!match) return NextResponse.json({ error: "Unknown match." }, { status: 404 });
  if (isLocked((match as Match).kickoff)) {
    return NextResponse.json({ error: "This match has kicked off — picks are locked." }, { status: 423 });
  }

  // Wildcards (doubles) are group-stage only.
  const isGroup = (match as Match).stage === "group";
  if (wildcard === "double" && !isGroup) {
    return NextResponse.json({ error: "Wildcards are group-stage only." }, { status: 400 });
  }

  const settings = await getSettings();

  // Enforce the double-wildcard budget (count usage excluding this match).
  if (wildcard === "double") {
    const { data: mine } = await db
      .from("predictions")
      .select("match_id")
      .eq("player_id", player.id)
      .eq("wildcard", "double")
      .neq("match_id", match_id);
    if ((mine ?? []).length >= settings.scoring.groupWildcards) {
      return NextResponse.json(
        { error: `No double wildcards left (max ${settings.scoring.groupWildcards}).` },
        { status: 409 },
      );
    }
  }

  const prediction: Prediction = {
    player_id: player.id,
    match_id,
    pred_home,
    pred_away,
    pred_first_team,
    wildcard,
    points: 0,
  };
  prediction.points = scorePrediction(prediction, match as Match, settings.scoring);

  const { error } = await db
    .from("predictions")
    .upsert({ ...prediction, updated_at: new Date().toISOString() }, { onConflict: "player_id,match_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, points: prediction.points });
}
