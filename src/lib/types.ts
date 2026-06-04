// Shared domain types for the World Cup prediction pool.

export type Stage =
  | "group"
  | "r32" // Round of 32
  | "r16" // Round of 16
  | "qf" // Quarter-final
  | "sf" // Semi-final
  | "third" // Third-place playoff
  | "final";

export type Side = "home" | "away" | "none"; // "none" = nobody scored (0-0)

// Which team advanced from a knockout tie (after ET/penalties if needed).
export type Advancing = "home" | "away" | null;

export type Wildcard = "none" | "double";

export interface Match {
  id: string;
  match_no: number;
  stage: Stage;
  group_label: string | null; // "A".."L" for group stage, null otherwise
  home_team: string; // team name or a placeholder like "Winner Group A"
  away_team: string;
  kickoff: string; // ISO timestamp
  venue: string | null;
  // Actual result (filled in by admin)
  finished: boolean;
  home_goals: number | null;
  away_goals: number | null;
  first_team: Side | null; // which side scored first
  advancing: Advancing; // knockout only: which side advanced (ET/penalties count)
  // Cached odds (de-vigged win/draw/loss probabilities, 0..1)
  prob_home: number | null;
  prob_draw: number | null;
  prob_away: number | null;
  odds_updated_at: string | null;
}

export interface Prediction {
  id?: string;
  player_id: string;
  match_id: string;
  pred_home: number;
  pred_away: number;
  pred_first_team: Side | null;
  wildcard: Wildcard;
  points: number; // computed
}

export interface BonusPrediction {
  player_id: string;
  champion: string | null;
  golden_boot: string | null;
  semifinalists: string[]; // up to 4 team names
  points: number; // computed
}

export interface BonusResults {
  champion: string | null;
  golden_boot: string | null;
  semifinalists: string[];
}

export interface Player {
  id: string;
  name: string;
  token: string;
  created_at: string;
}

export interface ScoringConfig {
  // Group / base tiers
  exact: number;
  resultAndOneTeam: number;
  resultOnly: number;
  oneTeamOnly: number;
  // Per-match bonus
  firstTeam: number; // first team to score
  // Knockout round multipliers (keyed by stage)
  roundMultiplier: Record<Exclude<Stage, "group">, number>;
  // Wildcards (group stage only)
  groupWildcards: number; // count of 2x match wildcards
  groupWildcardMultiplier: number; // 2
  // Tournament bonuses (pre-tournament long-shot picks — weighted to matter)
  championBonus: number;
  goldenBootBonus: number;
  semifinalistsBonus: number; // awarded PER correctly-picked semifinalist
}

export const DEFAULT_SCORING: ScoringConfig = {
  exact: 5,
  resultAndOneTeam: 3,
  resultOnly: 2,
  oneTeamOnly: 1,
  firstTeam: 1,
  roundMultiplier: { r32: 1, r16: 2, qf: 3, sf: 4, third: 2, final: 5 },
  groupWildcards: 3,
  groupWildcardMultiplier: 2,
  championBonus: 75,
  goldenBootBonus: 25,
  semifinalistsBonus: 10, // per correct semifinalist (max 40 for all four)
};

export const STAGE_LABELS: Record<Stage, string> = {
  group: "Group stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  third: "Third-place playoff",
  final: "Final",
};
