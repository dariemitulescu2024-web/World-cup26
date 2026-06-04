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

/** Point value of a correct W/D/L pick: a flat base + the odds value round(1/p). */
export function pointValue(prob: number | null | undefined, cfg: ScoringConfig): number {
  const base = cfg.groupBase ?? 0;
  const min = cfg.groupMinPoints ?? 1;
  if (!prob || prob <= 0) return base + min;
  return base + Math.max(min, Math.round(1 / prob));
}

/** Actual W/D/L result of a finished match, or null. */
export function matchResult(m: Match): Result | null {
  if (!m.finished || m.home_goals == null || m.away_goals == null) return null;
  if (m.home_goals > m.away_goals) return "home";
  if (m.home_goals < m.away_goals) return "away";
  return "draw";
}

function outcomeValue(pred: Prediction, match: Match): number {
  const v = pred.pick === "home" ? match.pts_home : pred.pick === "away" ? match.pts_away : match.pts_draw;
  return v ?? 0;
}

function wildcardFactor(pred: Prediction, cfg: ScoringConfig): number {
  return pred.wildcard ? cfg.wildcardMultiplier ?? 5 : 1;
}

/** Points a group W/D/L pick earns (0 until the match is final). 5× if it's a wildcard. */
export function scoreGroupPrediction(pred: Prediction, match: Match, cfg: ScoringConfig): number {
  const result = matchResult(match);
  if (!result || pred.pick !== result) return 0;
  return outcomeValue(pred, match) * wildcardFactor(pred, cfg);
}

/** Best still-achievable points for a single group pick (assumes it hits if unplayed). */
export function groupPickMax(pred: Prediction, match: Match, cfg: ScoringConfig): number {
  if (matchResult(match)) return scoreGroupPrediction(pred, match, cfg);
  return outcomeValue(pred, match) * wildcardFactor(pred, cfg);
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
  // Champion: flat bonus + the team's value, once a team is actually crowned.
  const champ = teamOf(teams, entry.champion);
  if (champ && champ.furthest === "champion") total += (cfg.championBonus ?? 0) + champ.champ_base;
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
  if (champ && (champ.furthest === "champion" || !champ.eliminated)) {
    total += (cfg.championBonus ?? 0) + champ.champ_base; // crowned, or could still win
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
