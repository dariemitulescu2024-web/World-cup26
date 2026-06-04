// Run with: node --test src/lib/scoring.test.ts   (Node 22.6+ strips types)
import { test } from "node:test";
import assert from "node:assert/strict";
import { baseScore, scorePrediction, scoreBonus, norm } from "./scoring.ts";
import { DEFAULT_SCORING } from "./types.ts";
import type { Match, Prediction } from "./types.ts";

const cfg = DEFAULT_SCORING;

const mkMatch = (over: Partial<Match>): Match => ({
  id: "m",
  match_no: 1,
  stage: "group",
  group_label: "A",
  home_team: "Brazil",
  away_team: "Serbia",
  kickoff: "2026-06-11T16:00:00Z",
  venue: null,
  finished: true,
  home_goals: 0,
  away_goals: 0,
  first_team: "none",
  advancing: null,
  prob_home: null,
  prob_draw: null,
  prob_away: null,
  odds_updated_at: null,
  ...over,
});

const mkPred = (over: Partial<Prediction>): Prediction => ({
  player_id: "p",
  match_id: "m",
  pred_home: 0,
  pred_away: 0,
  pred_first_team: null,
  wildcard: "none",
  points: 0,
  ...over,
});

test("base: exact score is top tier", () => {
  assert.equal(baseScore(2, 1, 2, 1, cfg), 5);
});

test("base: correct result + one team's goals (the clean-sheet credit)", () => {
  // predict 2-0, actual 3-0 -> home win right AND away 0 right
  assert.equal(baseScore(2, 0, 3, 0, cfg), 3);
});

test("base: correct result only", () => {
  assert.equal(baseScore(2, 1, 3, 0, cfg), 2);
});

test("base: wrong result but one team's goals (consolation)", () => {
  // predict 0-0 (draw), actual 1-0 (home win): away 0 right only
  assert.equal(baseScore(0, 0, 1, 0, cfg), 1);
});

test("base: completely wrong", () => {
  assert.equal(baseScore(0, 0, 2, 1, cfg), 0);
});

test("loophole: spamming 0-0 never beats a real prediction", () => {
  // The 0-0 spammer caps at the 1-pt consolation tier unless it's truly a draw.
  const spam = baseScore(0, 0, 2, 0, cfg); // away 0 right -> 1
  const real = baseScore(2, 0, 2, 0, cfg); // exact -> 5
  assert.ok(real > spam);
  assert.equal(spam, 1);
});

test("monotonic: being more correct never pays less", () => {
  for (let ah = 0; ah <= 4; ah++)
    for (let aa = 0; aa <= 4; aa++) {
      const exact = baseScore(ah, aa, ah, aa, cfg);
      // exact must be >= any other prediction's score for this actual result
      for (let ph = 0; ph <= 4; ph++)
        for (let pa = 0; pa <= 4; pa++) {
          assert.ok(exact >= baseScore(ph, pa, ah, aa, cfg));
        }
    }
});

test("group: first-team bonus adds and double wildcard multiplies the whole match", () => {
  const match = mkMatch({ home_goals: 2, away_goals: 0, first_team: "home" });
  const pred = mkPred({ pred_home: 2, pred_away: 0, pred_first_team: "home", wildcard: "double" });
  // base 5 (exact) + 1 (first team) = 6, doubled = 12
  assert.equal(scorePrediction(pred, match, cfg), 12);
});

test("knockout: result follows who advances, then round multiplier", () => {
  // 1-1 at 90', home advanced on penalties. Player predicted 2-1 (home win, decisive).
  const match = mkMatch({ stage: "final", home_goals: 1, away_goals: 1, first_team: "home", advancing: "home" });
  const pred = mkPred({ pred_home: 2, pred_away: 1, pred_first_team: "home" });
  // not exact; predicted winner = home == advancing -> result right; away goals 1==1 -> one team -> 3
  // + first team 1 = 4, * final x5 = 20
  assert.equal(scorePrediction(pred, match, cfg), 20);
});

test("knockout: predicting a draw earns no result points (someone always advances)", () => {
  const match = mkMatch({ stage: "qf", home_goals: 1, away_goals: 1, first_team: "home", advancing: "away" });
  const pred = mkPred({ pred_home: 1, pred_away: 1, pred_first_team: "home" });
  // exact 90' score 1-1 -> 5 (top tier) + first team 1 = 6, * QF x3 = 18
  assert.equal(scorePrediction(pred, match, cfg), 18);
  // a non-exact draw prediction gets only one-team/first-team, no result
  const pred2 = mkPred({ pred_home: 0, pred_away: 0, pred_first_team: "away" });
  // not exact; predicted draw -> no result; away 0 != 1 and home 0 != 1 -> no one-team; first team away != home -> 0
  assert.equal(scorePrediction(pred2, match, cfg), 0);
});

test("unfinished match scores zero", () => {
  const match = mkMatch({ finished: false, home_goals: null, away_goals: null });
  assert.equal(scorePrediction(mkPred({}), match, cfg), 0);
});

test("bonus: champion + all four semifinalists (order independent)", () => {
  const pts = scoreBonus(
    { player_id: "p", champion: "Brazil", golden_boot: "Haaland", semifinalists: ["France", "Spain", "Brazil", "Argentina"], points: 0 },
    { champion: "Brazil", golden_boot: "Messi", semifinalists: ["Argentina", "Brazil", "France", "Spain"] },
    cfg,
  );
  // champion +75, golden boot wrong +0, all 4 semis x10 = 40 -> 115
  assert.equal(pts, 115);
});

test("bonus: partial semifinalists credit (2 of 4 right)", () => {
  const pts = scoreBonus(
    { player_id: "p", champion: null, golden_boot: null, semifinalists: ["Brazil", "France", "England", "Germany"], points: 0 },
    { champion: "Argentina", golden_boot: "Messi", semifinalists: ["Brazil", "France", "Spain", "Argentina"] },
    cfg,
  );
  // 2 correct semis (Brazil, France) x10 = 20
  assert.equal(pts, 20);
});

test("norm: forgiving name matching", () => {
  assert.equal(norm("  Müller "), norm("muller"));
});
