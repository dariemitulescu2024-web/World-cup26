import { admin } from "./supabaseAdmin";
import { norm, scoreEntry, scoreGroupPrediction } from "./scoring";
import { DEFAULT_SCORING, Entry, Match, Prediction, ScoringConfig, Team } from "./types";

export interface Settings {
  id: number;
  join_code: string;
  tournament_locked: boolean;
  scoring: ScoringConfig;
  golden_boot_result: string | null;
  odds_locked_at: string | null;
}

export async function getSettings(): Promise<Settings> {
  const { data } = await admin().from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) {
    return {
      id: 1, join_code: "WORLDCUP26", tournament_locked: false,
      scoring: DEFAULT_SCORING, golden_boot_result: null, odds_locked_at: null,
    };
  }
  return data as Settings;
}

/** All teams keyed by normalized name. */
export async function getTeamsMap(): Promise<Record<string, Team>> {
  const { data } = await admin().from("teams").select("*");
  const map: Record<string, Team> = {};
  for (const t of (data ?? []) as Team[]) map[norm(t.name)] = t;
  return map;
}

/** Recompute and persist points for every group pick on one match. */
export async function recomputeMatch(matchId: string) {
  const db = admin();
  const { data: match } = await db.from("matches").select("*").eq("id", matchId).maybeSingle();
  if (!match) return;
  const { data: preds } = await db.from("predictions").select("*").eq("match_id", matchId);
  for (const p of (preds ?? []) as Prediction[]) {
    const pts = scoreGroupPrediction(p, match as Match);
    if (pts !== p.points) await db.from("predictions").update({ points: pts }).eq("id", p.id);
  }
}

/** Recompute every player's pre-tournament entry (champion / golden boot / ride). */
export async function recomputeEntries() {
  const s = await getSettings();
  const teams = await getTeamsMap();
  const db = admin();
  const { data: entries } = await db.from("entries").select("*");
  for (const e of (entries ?? []) as Entry[]) {
    const pts = scoreEntry(e, teams, s.golden_boot_result, s.scoring);
    if (pts !== e.points) await db.from("entries").update({ points: pts }).eq("player_id", e.player_id);
  }
}

/** Recompute everything (after a scoring/odds/team-progress change). */
export async function recomputeAll() {
  const db = admin();
  const { data: matches } = await db.from("matches").select("id").eq("finished", true);
  for (const m of matches ?? []) await recomputeMatch(m.id);
  await recomputeEntries();
}
