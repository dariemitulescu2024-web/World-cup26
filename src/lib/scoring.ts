// Pure scoring engine (v2 — odds-based). No I/O; unit-testable.
import type { Entry, Match, Prediction, Result, ScoringConfig, Team } from "./types";

export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Point value of an outcome from its probability: round(1/p), floored at the min. */
export function pointValue(prob: number | null | undefined, cfg: ScoringConfig): number {
  const min = cfg.groupMinPoints ?? 1;
  if (!prob || prob <= 0) return min;
  return Math.max(min, Math.round(1 / prob));
}

/** Actual W/D/L result of a finished match, or null. */
export function matchResult(m: Match): Result | null {
  if (!m.finished || m.home_goals == null || m.away_goals == null) return null;
  if (m.home_goals > m.away_goals) return "home";
  if (m.home_goals < m.away_goals) return "away";
  return "draw";
}

/** Points a group W/D/L pick earns (0 until the match is final). */
export function scoreGroupPrediction(pred: Prediction, match: Match): number {
  const result = matchResult(match);
  if (!result) return 0;
  if (pred.pick !== result) return 0;
  const v = pred.pick === "home" ? match.pts_home : pred.pick === "away" ? match.pts_away : match.pts_draw;
  return v ?? 0;
}

/** Best still-achievable points for a single group pick (assumes it hits if unplayed). */
export function groupPickMax(pred: Prediction, match: Match): number {
  if (matchResult(match)) return scoreGroupPrediction(pred, match);
  const v = pred.pick === "home" ? match.pts_home : pred.pick === "away" ? match.pts_away : match.pts_draw;
  return v ?? 0;
}

/** Realized points for a ride team: value × multiplier of the furthest round reached. */
export function rideTeamPoints(team: Team, cfg: ScoringConfig): number {
  return team.champ_base * (cfg.rideMultiplier?.[team.furthest] ?? 0);
}

/** Best still-achievable points for a ride team (base × 5 if still alive). */
export function rideTeamMax(team: Team, cfg: ScoringConfig): number {
  if (team.eliminated) return rideTeamPoints(team, cfg);
  return team.champ_base * (cfg.rideMultiplier?.champion ?? 5);
}

function teamOf(teams: Record<string, Team>, name: string | null | undefined): Team | undefined {
  return name ? teams[norm(name)] : undefined;
}

/** Realized points for a player's pre-tournament entry. */
export function scoreEntry(
  entry: Entry,
  teams: Record<string, Team>,
  goldenBootResult: string | null,
  cfg: ScoringConfig,
): number {
  let total = 0;
  // Champion: correct only once a team is actually crowned.
  const champ = teamOf(teams, entry.champion);
  if (champ && champ.furthest === "champion") total += champ.champ_base;
  // Golden Boot: flat bonus.
  if (goldenBootResult && norm(entry.golden_boot) === norm(goldenBootResult)) {
    total += cfg.goldenBoot ?? 30;
  }
  // Ride: each picked team's realized value.
  for (const name of entry.ride_teams ?? []) {
    const t = teamOf(teams, name);
    if (t) total += rideTeamPoints(t, cfg);
  }
  return total;
}

/** Best still-achievable points for an entry (champion alive, ride teams could win, GB if undecided). */
export function maxEntry(
  entry: Entry,
  teams: Record<string, Team>,
  goldenBootResult: string | null,
  cfg: ScoringConfig,
): number {
  let total = 0;
  const champ = teamOf(teams, entry.champion);
  if (champ) {
    if (champ.furthest === "champion") total += champ.champ_base;
    else if (!champ.eliminated) total += champ.champ_base; // could still win
  }
  if (goldenBootResult) {
    if (norm(entry.golden_boot) === norm(goldenBootResult)) total += cfg.goldenBoot;
  } else if (entry.golden_boot) {
    total += cfg.goldenBoot ?? 30; // undecided — assume it hits
  }
  for (const name of entry.ride_teams ?? []) {
    const t = teamOf(teams, name);
    if (t) total += rideTeamMax(t, cfg);
  }
  return total;
}

/** A match is locked for picks once kickoff has passed. */
export function isLocked(kickoff: string, now: Date = new Date()): boolean {
  return new Date(kickoff).getTime() <= now.getTime();
}
