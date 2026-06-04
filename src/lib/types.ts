// Shared domain types for the World Cup prediction pool (v2 — odds-based scoring).

export type Stage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export type Result = "home" | "draw" | "away";

// How far a team gets in the knockouts (drives the "ride" multiplier).
export type RideRound = "group" | "r32" | "r16" | "qf" | "sf" | "final" | "champion";

export interface Match {
  id: string;
  match_no: number;
  stage: Stage;
  group_label: string | null;
  home_team: string;
  away_team: string;
  kickoff: string;
  venue: string | null;
  finished: boolean;
  home_goals: number | null;
  away_goals: number | null;
  // Locked (point-in-time) de-vigged probabilities + the resulting point values.
  prob_home: number | null;
  prob_draw: number | null;
  prob_away: number | null;
  pts_home: number | null; // round(1/prob_home), min 1
  pts_draw: number | null;
  pts_away: number | null;
  odds_updated_at: string | null;
}

export interface Team {
  name: string;
  champ_prob: number | null; // locked championship probability
  champ_base: number; // round(1/champ_prob) — the team's value
  furthest: RideRound; // deepest round reached so far
  eliminated: boolean; // true once knocked out (or champion)
}

export interface Prediction {
  id?: string;
  player_id: string;
  match_id: string;
  pick: Result;
  points: number;
}

// Pre-tournament picks (locked at the first kickoff).
export interface Entry {
  player_id: string;
  champion: string | null; // team name
  golden_boot: string | null; // player name
  ride_teams: string[]; // up to 3 team names (may include the champion pick)
  points: number;
}

export interface Player {
  id: string;
  name: string;
  token: string;
  created_at: string;
}

export interface ScoringConfig {
  groupMinPoints: number; // floor for a correct W/D/L pick
  rideMultiplier: Record<RideRound, number>; // value × this, by furthest round
  rideTeams: number; // how many teams you pick (3)
  goldenBoot: number; // flat bonus for a correct Golden Boot pick
  championBonus: number; // flat bonus added to the team's value for a correct champion pick
}

export const DEFAULT_SCORING: ScoringConfig = {
  groupMinPoints: 1,
  rideMultiplier: { group: 0, r32: 0, r16: 1, qf: 2, sf: 3, final: 4, champion: 5 },
  rideTeams: 3,
  goldenBoot: 30,
  championBonus: 50,
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

export const RIDE_ROUND_LABELS: Record<RideRound, string> = {
  group: "Group stage",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-final",
  sf: "Semi-final",
  final: "Final",
  champion: "Champion",
};
