// Pure scoring engine. No I/O — fully unit-testable.
import type {
  BonusPrediction,
  BonusResults,
  Match,
  Prediction,
  ScoringConfig,
  Stage,
} from "./types";

/** Normalize a player/team name for forgiving comparison. */
export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sign(n: number): number {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Tiered base score for a predicted scoreline vs the actual scoreline.
 * Tiers are mutually exclusive (no stacking) and strictly ordered by
 * correctness, so being *less* correct can never pay more.
 */
export function baseScore(
  ph: number,
  pa: number,
  ah: number,
  aa: number,
  cfg: ScoringConfig,
): number {
  if (ph === ah && pa === aa) return cfg.exact;
  const resultRight = sign(ph - pa) === sign(ah - aa);
  const oneTeamRight = ph === ah || pa === aa;
  if (resultRight && oneTeamRight) return cfg.resultAndOneTeam;
  if (resultRight) return cfg.resultOnly;
  if (oneTeamRight) return cfg.oneTeamOnly;
  return 0;
}

function firstTeamCorrect(pred: Prediction, match: Match): boolean {
  if (pred.pred_first_team == null || match.first_team == null) return false;
  return pred.pred_first_team === match.first_team;
}

function roundMultiplier(stage: Stage, cfg: ScoringConfig): number {
  if (stage === "group") return 1;
  return cfg.roundMultiplier[stage] ?? 1;
}

/**
 * Knockout base score. Exact scoreline + one-team are judged on the 90-minute
 * score; the win/loss "result" tier follows who ADVANCES (ET/penalties count).
 * A predicted draw earns no result credit (a knockout always has a winner).
 */
function knockoutBase(ph: number, pa: number, ah: number, aa: number, advancing: Match["advancing"], cfg: ScoringConfig): number {
  if (ph === ah && pa === aa) return cfg.exact;
  const predWinner = ph > pa ? "home" : pa > ph ? "away" : null;
  const resultRight = predWinner !== null && advancing === predWinner;
  const oneTeamRight = ph === ah || pa === aa;
  if (resultRight && oneTeamRight) return cfg.resultAndOneTeam;
  if (resultRight) return cfg.resultOnly;
  if (oneTeamRight) return cfg.oneTeamOnly;
  return 0;
}

/**
 * Points a single prediction earns once the match has an actual result.
 * Returns 0 if the match isn't finished or is missing a result.
 */
export function scorePrediction(
  pred: Prediction,
  match: Match,
  cfg: ScoringConfig,
): number {
  if (!match.finished || match.home_goals == null || match.away_goals == null) {
    return 0;
  }
  const ft = firstTeamCorrect(pred, match) ? cfg.firstTeam : 0;

  if (match.stage === "group") {
    const base = baseScore(pred.pred_home, pred.pred_away, match.home_goals, match.away_goals, cfg);
    let total = base + ft;
    if (pred.wildcard === "double") total *= cfg.groupWildcardMultiplier;
    return total;
  }

  // Knockout: result by advancement, whole match scaled by the round multiplier.
  const base = knockoutBase(pred.pred_home, pred.pred_away, match.home_goals, match.away_goals, match.advancing, cfg);
  return (base + ft) * roundMultiplier(match.stage, cfg);
}

/** Tournament-wide bonus prediction scoring. */
export function scoreBonus(
  pred: BonusPrediction,
  results: BonusResults,
  cfg: ScoringConfig,
): number {
  let total = 0;
  if (results.champion && norm(pred.champion) === norm(results.champion)) {
    total += cfg.championBonus;
  }
  if (results.golden_boot && norm(pred.golden_boot) === norm(results.golden_boot)) {
    total += cfg.goldenBootBonus;
  }
  // Per correctly-picked semifinalist (order-independent, partial credit).
  const actual = new Set((results.semifinalists ?? []).map(norm).filter(Boolean));
  if (actual.size > 0) {
    const guessed = new Set((pred.semifinalists ?? []).map(norm).filter(Boolean));
    let correct = 0;
    for (const t of guessed) if (actual.has(t)) correct++;
    total += correct * cfg.semifinalistsBonus;
  }
  return total;
}

/** A match is locked for predictions once kickoff has passed. */
export function isLocked(kickoff: string, now: Date = new Date()): boolean {
  return new Date(kickoff).getTime() <= now.getTime();
}
