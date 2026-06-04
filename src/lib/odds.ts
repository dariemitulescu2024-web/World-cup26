import { admin } from "./supabaseAdmin";
import { norm } from "./scoring";
import { Match } from "./types";

// Maps The Odds API team naming quirks to our names (best-effort).
const ALIASES: Record<string, string> = {
  usa: "united states",
  "united states of america": "united states",
  "korea republic": "south korea",
  "republic of korea": "south korea",
  "south korea": "south korea",
  "ivory coast": "ivory coast",
  "cote d ivoire": "ivory coast",
  "czechia": "czech republic",
  "turkiye": "turkey",
  "dr congo": "dr congo",
  "democratic republic of the congo": "dr congo",
  "cape verde": "cape verde",
  "cabo verde": "cape verde",
  // The Odds API writes "Bosnia & Herzegovina" (the "&" is stripped by norm()).
  "bosnia herzegovina": "bosnia and herzegovina",
};

function canon(name: string): string {
  const n = norm(name);
  return ALIASES[n] ?? n;
}

interface Outcome {
  name: string;
  price: number;
}
interface ApiEvent {
  home_team: string;
  away_team: string;
  bookmakers: { markets: { key: string; outcomes: Outcome[] }[] }[];
}

/**
 * Fetch h2h odds from The Odds API, de-vig to clean W/D/L probabilities, and
 * cache them on matching unfinished matches. Returns count updated. No-ops
 * gracefully (returns 0) if no API key is set or the request fails.
 */
export async function refreshOdds(): Promise<{ updated: number; note?: string }> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return { updated: 0, note: "No ODDS_API_KEY set — odds bar disabled." };

  const sport = process.env.ODDS_API_SPORT || "soccer_fifa_world_cup";
  const u = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
  u.searchParams.set("apiKey", apiKey);
  u.searchParams.set("regions", "uk,eu");
  u.searchParams.set("markets", "h2h");
  u.searchParams.set("oddsFormat", "decimal");

  let events: ApiEvent[];
  try {
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) return { updated: 0, note: `Odds API returned ${res.status}.` };
    events = (await res.json()) as ApiEvent[];
  } catch (e) {
    return { updated: 0, note: `Odds API request failed: ${(e as Error).message}` };
  }

  const db = admin();
  const { data: matches } = await db
    .from("matches")
    .select("*")
    .eq("finished", false);
  const list = (matches ?? []) as Match[];

  let updated = 0;
  for (const ev of events) {
    const h = canon(ev.home_team);
    const a = canon(ev.away_team);
    // Average the de-vigged probabilities across all bookmakers for stability.
    let ph = 0,
      pd = 0,
      pa = 0,
      books = 0;
    for (const bk of ev.bookmakers ?? []) {
      const mkt = bk.markets?.find((m) => m.key === "h2h");
      if (!mkt) continue;
      const oHome = mkt.outcomes.find((o) => canon(o.name) === h)?.price;
      const oAway = mkt.outcomes.find((o) => canon(o.name) === a)?.price;
      const oDraw = mkt.outcomes.find((o) => norm(o.name) === "draw")?.price;
      if (!oHome || !oAway || !oDraw) continue;
      const ih = 1 / oHome,
        id = 1 / oDraw,
        ia = 1 / oAway;
      const sum = ih + id + ia;
      ph += ih / sum;
      pd += id / sum;
      pa += ia / sum;
      books++;
    }
    if (!books) continue;
    ph /= books;
    pd /= books;
    pa /= books;

    // Our seeded fixtures may store home/away in the opposite order to the API,
    // so match either orientation and swap the win probabilities to align with
    // OUR stored home_team / away_team.
    const direct = list.find((m) => canon(m.home_team) === h && canon(m.away_team) === a);
    const flipped = direct
      ? null
      : list.find((m) => canon(m.home_team) === a && canon(m.away_team) === h);
    const match = direct ?? flipped;
    if (!match) continue;
    await db
      .from("matches")
      .update({
        prob_home: direct ? ph : pa,
        prob_draw: pd,
        prob_away: direct ? pa : ph,
        odds_updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);
    updated++;
  }
  return { updated };
}
