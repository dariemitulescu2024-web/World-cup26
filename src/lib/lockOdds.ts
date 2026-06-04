import { admin } from "./supabaseAdmin";
import { getSettings } from "./recompute";
import { norm, pointValue } from "./scoring";
import { ALL_TEAMS } from "./teams";
import { Match } from "./types";

// The Odds API names vs ours (best-effort).
const ALIASES: Record<string, string> = {
  usa: "united states",
  "united states of america": "united states",
  "korea republic": "south korea",
  czechia: "czech republic",
  turkiye: "turkey",
  "democratic republic of the congo": "dr congo",
  "cote d ivoire": "ivory coast",
  "cabo verde": "cape verde",
  "bosnia herzegovina": "bosnia and herzegovina",
};
function canon(name: string): string {
  const n = norm(name);
  return ALIASES[n] ?? n;
}

const SPORT = process.env.ODDS_API_SPORT || "soccer_fifa_world_cup";
const WINNER_SPORT = process.env.ODDS_API_WINNER_SPORT || "soccer_fifa_world_cup_winner";

interface Outcome { name: string; price: number }
interface ApiEvent {
  home_team?: string;
  away_team?: string;
  bookmakers: { markets: { key: string; outcomes: Outcome[] }[] }[];
}

async function fetchEvents(sport: string, markets: string): Promise<ApiEvent[] | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;
  const u = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("regions", "uk,eu");
  u.searchParams.set("markets", markets);
  u.searchParams.set("oddsFormat", "decimal");
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as ApiEvent[];
  } catch {
    return null;
  }
}

/**
 * One-time: capture current odds and freeze them as the scoring basis.
 * - Group matches: de-vigged W/D/L probabilities -> point values (round(1/p)).
 * - Teams: de-vigged championship probabilities -> each team's base value.
 */
export async function lockOdds(): Promise<{ matches: number; teams: number; note?: string }> {
  if (!process.env.ODDS_API_KEY) return { matches: 0, teams: 0, note: "No ODDS_API_KEY set." };
  const db = admin();
  const cfg = (await getSettings()).scoring;

  // ---- Group W/D/L ---------------------------------------------------------
  let matchesUpdated = 0;
  const events = await fetchEvents(SPORT, "h2h");
  if (events) {
    const { data } = await db.from("matches").select("*").eq("stage", "group");
    const list = (data ?? []) as Match[];
    for (const ev of events) {
      if (!ev.home_team || !ev.away_team) continue;
      const h = canon(ev.home_team);
      const a = canon(ev.away_team);
      let ph = 0, pd = 0, pa = 0, books = 0;
      for (const bk of ev.bookmakers ?? []) {
        const mkt = bk.markets?.find((m) => m.key === "h2h");
        if (!mkt) continue;
        const oHome = mkt.outcomes.find((o) => canon(o.name) === h)?.price;
        const oAway = mkt.outcomes.find((o) => canon(o.name) === a)?.price;
        const oDraw = mkt.outcomes.find((o) => norm(o.name) === "draw")?.price;
        if (!oHome || !oAway || !oDraw) continue;
        const ih = 1 / oHome, id = 1 / oDraw, ia = 1 / oAway;
        const s = ih + id + ia;
        ph += ih / s; pd += id / s; pa += ia / s; books++;
      }
      if (!books) continue;
      ph /= books; pd /= books; pa /= books;
      const direct = list.find((m) => canon(m.home_team) === h && canon(m.away_team) === a);
      const flip = direct ? null : list.find((m) => canon(m.home_team) === a && canon(m.away_team) === h);
      const match = direct ?? flip;
      if (!match) continue;
      const probHome = direct ? ph : pa;
      const probAway = direct ? pa : ph;
      const { error } = await db.from("matches").update({
        prob_home: probHome, prob_draw: pd, prob_away: probAway,
        pts_home: pointValue(probHome, cfg), pts_draw: pointValue(pd, cfg), pts_away: pointValue(probAway, cfg),
        odds_updated_at: new Date().toISOString(),
      }).eq("id", match.id);
      if (!error) matchesUpdated++;
    }
  }

  // ---- Championship outrights ---------------------------------------------
  // A team's value = its raw decimal title odds (the bookmaker's price), averaged
  // across books. NOT de-vigged: "inverse of the odds" == the decimal price, so a
  // ~20% favorite ≈ 5, a longshot at +15000 ≈ 150. Keeps underdogs rewarding but sane.
  const avgOdds: Record<string, number> = {};
  const winner = await fetchEvents(WINNER_SPORT, "outrights");
  if (winner) {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const ev of winner) {
      for (const bk of ev.bookmakers ?? []) {
        const mkt = bk.markets?.find((m) => m.key === "outrights");
        if (!mkt) continue;
        for (const o of mkt.outcomes) {
          if (o.price > 0) {
            const n = canon(o.name);
            sums[n] = (sums[n] ?? 0) + o.price;
            counts[n] = (counts[n] ?? 0) + 1;
          }
        }
      }
    }
    for (const n of Object.keys(sums)) avgOdds[n] = sums[n] / counts[n];
  }

  // Seed all 48 teams; teams missing from the winner market get a longshot fallback.
  // Cap the value so one fluke minnow can't dwarf the whole pool ("balanced").
  const CAP = Number(process.env.TEAM_VALUE_CAP || 150);
  let teamsUpserted = 0;
  for (const team of ALL_TEAMS) {
    const odds = avgOdds[canon(team)] ?? null;
    const base = Math.min(CAP, odds && odds > 0 ? Math.max(2, Math.round(odds)) : CAP);
    const champ_prob = odds && odds > 0 ? 1 / odds : null;
    const { error } = await db
      .from("teams")
      .upsert({ name: team, champ_prob, champ_base: base }, { onConflict: "name" });
    if (!error) teamsUpserted++;
  }

  await db.from("settings").update({ odds_locked_at: new Date().toISOString() }).eq("id", 1);
  return { matches: matchesUpdated, teams: teamsUpserted };
}
