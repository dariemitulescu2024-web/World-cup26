// Run with: node --test src/lib/scoring.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  pointValue,
  matchResult,
  scoreGroupPrediction,
  groupPickMax,
  rideTeamPoints,
  rideTeamMax,
  scoreEntry,
  maxEntry,
  norm,
} from "./scoring.ts";
import { DEFAULT_SCORING } from "./types.ts";
import type { Entry, Match, Prediction, RideRound, Team } from "./types.ts";

const cfg = DEFAULT_SCORING;

const mkMatch = (over: Partial<Match>): Match => ({
  id: "m", match_no: 1, stage: "group", group_label: "A",
  home_team: "Brazil", away_team: "Serbia", kickoff: "2026-06-11T16:00:00Z", venue: null,
  finished: true, home_goals: 2, away_goals: 1,
  prob_home: 0.5, prob_draw: 0.25, prob_away: 0.2,
  pts_home: 2, pts_draw: 4, pts_away: 5,
  odds_updated_at: null, ...over,
});

const mkTeam = (name: string, base: number, furthest: RideRound, eliminated: boolean): Team => ({
  name, champ_prob: 1 / base, champ_base: base, furthest, eliminated,
});

const teamsRec = (...ts: Team[]): Record<string, Team> => {
  const r: Record<string, Team> = {};
  for (const t of ts) r[norm(t.name)] = t;
  return r;
};

const mkPred = (over: Partial<Prediction>): Prediction => ({
  player_id: "p", match_id: "m", pick: "home", wildcard: false, points: 0, ...over,
});

test("pointValue = groupBase + round(1/p) (favorites stay viable)", () => {
  assert.equal(pointValue(0.5, cfg), 5); // 3 + 2
  assert.equal(pointValue(0.2, cfg), 8); // 3 + 5
  assert.equal(pointValue(0.0067, cfg), 152); // 3 + 149
  assert.equal(pointValue(0.95, cfg), 4); // heavy favorite: 3 + 1
  assert.equal(pointValue(0, cfg), 4);
});

test("matchResult derives W/D/L", () => {
  assert.equal(matchResult(mkMatch({ home_goals: 2, away_goals: 1 })), "home");
  assert.equal(matchResult(mkMatch({ home_goals: 1, away_goals: 1 })), "draw");
  assert.equal(matchResult(mkMatch({ home_goals: 0, away_goals: 2 })), "away");
  assert.equal(matchResult(mkMatch({ finished: false, home_goals: null, away_goals: null })), null);
});

test("group pick: correct earns the outcome's value, wrong earns 0", () => {
  const match = mkMatch({ home_goals: 0, away_goals: 2 }); // away win, pts_away 5
  assert.equal(scoreGroupPrediction(mkPred({ pick: "away" }), match, cfg), 5);
  assert.equal(scoreGroupPrediction(mkPred({ pick: "home" }), match, cfg), 0);
});

test("wildcard game scores 5×", () => {
  const match = mkMatch({ home_goals: 0, away_goals: 2 }); // away win, pts_away 5
  assert.equal(scoreGroupPrediction(mkPred({ pick: "away", wildcard: true }), match, cfg), 25);
  assert.equal(scoreGroupPrediction(mkPred({ pick: "home", wildcard: true }), match, cfg), 0); // wrong, still 0
});

test("group pick max assumes an unplayed pick hits (and respects wildcard)", () => {
  const match = mkMatch({ finished: false, home_goals: null, away_goals: null });
  assert.equal(groupPickMax(mkPred({ pick: "away" }), match, cfg), 5);
  assert.equal(groupPickMax(mkPred({ pick: "away", wildcard: true }), match, cfg), 25);
});

test("ride team: value × furthest-round multiplier", () => {
  assert.equal(rideTeamPoints(mkTeam("Argentina", 8, "sf", true), cfg), 24); // 8 × 3
  assert.equal(rideTeamPoints(mkTeam("Canada", 150, "group", true), cfg), 0); // out before R16
  assert.equal(rideTeamPoints(mkTeam("France", 5, "champion", false), cfg), 25); // 5 × 5
});

test("ride team max: alive could win (×5), eliminated is locked", () => {
  assert.equal(rideTeamMax(mkTeam("France", 5, "qf", false), cfg), 25); // alive -> base×5
  assert.equal(rideTeamMax(mkTeam("Canada", 150, "qf", true), cfg), 300); // eliminated at QF -> 150×2
});

test("entry: champion + golden boot + ride, with champion/ride double-up allowed", () => {
  const teams = teamsRec(
    mkTeam("France", 5, "champion", false),
    mkTeam("Argentina", 8, "sf", true),
    mkTeam("Canada", 150, "group", true),
  );
  const entry: Entry = {
    player_id: "p", champion: "France", golden_boot: "Mbappe",
    ride_teams: ["France", "Argentina", "Canada"], points: 0,
  };
  // champion France (50 bonus + 5 value); golden boot +30; ride: France 25 + Argentina 24 + Canada 0 = 49
  assert.equal(scoreEntry(entry, teams, "Mbappe", cfg), 55 + 30 + 49);
});

test("entry max: undecided GB counts, champion alive counts, ride teams could win", () => {
  const teams = teamsRec(
    mkTeam("Spain", 6, "qf", false), // alive
    mkTeam("Brazil", 7, "r16", true), // out at R16 -> realized 7
  );
  const entry: Entry = {
    player_id: "p", champion: "Spain", golden_boot: "Yamal",
    ride_teams: ["Spain", "Brazil"], points: 0,
  };
  // champion Spain alive (50 + 6); GB undecided +30; ride: Spain max 6×5=30, Brazil out 7×1=7
  assert.equal(maxEntry(entry, teams, null, cfg), 56 + 30 + 30 + 7);
});

test("norm: forgiving matching", () => {
  assert.equal(norm("  Côte d'Ivoire "), norm("cote d ivoire"));
});
