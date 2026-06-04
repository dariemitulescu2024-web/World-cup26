import { NextRequest, NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { isAdmin } from "@/lib/session";
import { getSettings, recomputeAll, recomputeBonus } from "@/lib/recompute";
import { BonusResults, ScoringConfig } from "@/lib/types";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = await getSettings();

  const update: Record<string, unknown> = {};
  let scoringChanged = false;
  let bonusChanged = false;

  if (typeof body.join_code === "string" && body.join_code.trim()) {
    update.join_code = body.join_code.trim();
  }
  if (typeof body.tournament_locked === "boolean") {
    update.tournament_locked = body.tournament_locked;
  }
  if (body.scoring && typeof body.scoring === "object") {
    update.scoring = body.scoring as ScoringConfig;
    scoringChanged = true;
  }
  if (body.bonus_results && typeof body.bonus_results === "object") {
    const br = body.bonus_results as BonusResults;
    update.bonus_results = {
      champion: br.champion ?? null,
      golden_boot: br.golden_boot ?? null,
      semifinalists: Array.isArray(br.semifinalists) ? br.semifinalists.filter(Boolean).slice(0, 4) : [],
    };
    bonusChanged = true;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await admin().from("settings").update(update).eq("id", current.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Recompute as needed so the leaderboard reflects the change immediately.
  if (scoringChanged) await recomputeAll(update.scoring as ScoringConfig);
  else if (bonusChanged) await recomputeBonus();

  return NextResponse.json({ ok: true });
}
