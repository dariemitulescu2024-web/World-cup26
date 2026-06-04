import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { recomputeMatch } from "@/lib/recompute";
import { Side } from "@/lib/types";

const SIDES: Side[] = ["home", "away", "none"];

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { match_id } = body;
  if (!match_id) return NextResponse.json({ error: "Missing match." }, { status: 400 });

  const finished = !!body.finished;
  let update: Record<string, unknown>;

  if (!finished) {
    update = { finished: false, home_goals: null, away_goals: null, first_team: null, advancing: null };
  } else {
    const home_goals = Number(body.home_goals);
    const away_goals = Number(body.away_goals);
    if (!Number.isInteger(home_goals) || !Number.isInteger(away_goals) || home_goals < 0 || away_goals < 0) {
      return NextResponse.json({ error: "Goals must be whole numbers ≥ 0." }, { status: 400 });
    }
    let first_team: Side | null = SIDES.includes(body.first_team) ? body.first_team : null;
    if (home_goals + away_goals === 0) {
      first_team = "none";
    } else if (!first_team) {
      return NextResponse.json({ error: "Pick which team scored first." }, { status: 400 });
    }

    // Knockouts need a team that advances (the result is scored on this, not the draw).
    const { data: m } = await admin().from("matches").select("stage").eq("id", match_id).maybeSingle();
    const isKnockout = !!m && m.stage !== "group";
    let advancing: "home" | "away" | null = null;
    if (isKnockout) {
      advancing = body.advancing === "home" || body.advancing === "away" ? body.advancing : null;
      if (!advancing) {
        return NextResponse.json({ error: "Pick which team advanced." }, { status: 400 });
      }
    }

    update = { finished: true, home_goals, away_goals, first_team, advancing };
  }

  const { error } = await admin().from("matches").update(update).eq("id", match_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recomputeMatch(match_id);
  return NextResponse.json({ ok: true });
}
