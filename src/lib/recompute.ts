import { admin } from "./supabaseAdmin";
import { scoreBonus, scorePrediction } from "./scoring";
import {
  BonusResults,
  DEFAULT_SCORING,
  Match,
  Prediction,
  ScoringConfig,
} from "./types";

export interface Settings {
  id: number;
  join_code: string;
  tournament_locked: boolean;
  scoring: ScoringConfig;
  bonus_results: BonusResults;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await admin().from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) {
    return {
      id: 1,
      join_code: "WORLDCUP26",
      tournament_locked: false,
      scoring: DEFAULT_SCORING,
      bonus_results: { champion: null, golden_boot: null, semifinalists: [] },
    };
  }
  return data as Settings;
}

/** Recompute and persist points for every prediction on a single match. */
export async function recomputeMatch(matchId: string, scoring?: ScoringConfig) {
  const cfg = scoring ?? (await getSettings()).scoring;
  const db = admin();
  const { data: match } = await db.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return;
  const { data: preds } = await db
    .from("predictions")
    .select("*")
    .eq("match_id", matchId);
  for (const p of (preds ?? []) as Prediction[]) {
    const pts = scorePrediction(p, match as Match, cfg);
    if (pts !== p.points) {
      await db.from("predictions").update({ points: pts }).eq("id", p.id);
    }
  }
}

/** Recompute every prediction across every match (e.g. after a scoring change). */
export async function recomputeAll(scoring?: ScoringConfig) {
  const cfg = scoring ?? (await getSettings()).scoring;
  const db = admin();
  const { data: matches } = await db.from("matches").select("*").eq("finished", true);
  for (const m of (matches ?? []) as Match[]) {
    await recomputeMatch(m.id, cfg);
  }
  await recomputeBonus(cfg);
}

/** Recompute tournament-bonus points for every player. */
export async function recomputeBonus(scoring?: ScoringConfig) {
  const s = await getSettings();
  const cfg = scoring ?? s.scoring;
  const db = admin();
  const { data: bonuses } = await db.from("bonus_predictions").select("*");
  for (const b of bonuses ?? []) {
    const pts = scoreBonus(
      {
        player_id: b.player_id,
        champion: b.champion,
        golden_boot: b.golden_boot,
        semifinalists: b.semifinalists ?? [],
        points: b.points,
      },
      s.bonus_results,
      cfg,
    );
    if (pts !== b.points) {
      await db.from("bonus_predictions").update({ points: pts }).eq("player_id", b.player_id);
    }
  }
}
