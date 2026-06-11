// Update group-match kickoff times to the real schedule from The Odds API
// (each event's commence_time is the authoritative kickoff). Data-only update.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ALIASES = {
  usa: "united states", "united states of america": "united states", "korea republic": "south korea",
  czechia: "czech republic", turkiye: "turkey", "democratic republic of the congo": "dr congo",
  "cote d ivoire": "ivory coast", "cabo verde": "cape verde", "bosnia herzegovina": "bosnia and herzegovina",
};
const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const canon = (s) => ALIASES[norm(s)] ?? norm(s);
const TO = (iso) => new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const sport = process.env.ODDS_API_SPORT || "soccer_fifa_world_cup";
const u = new URL(`https://api.the-odds-api.com/v4/sports/${sport}/odds/`);
u.searchParams.set("apiKey", process.env.ODDS_API_KEY);
u.searchParams.set("regions", "uk,eu");
u.searchParams.set("markets", "h2h");
const res = await fetch(u);
if (!res.ok) { console.error("Odds API error", res.status); process.exit(1); }
const events = await res.json();
console.log("events from API:", events.length);

const { data: matches } = await db.from("matches").select("*").eq("stage", "group");
let updated = 0;
const samples = [];
for (const ev of events) {
  const h = canon(ev.home_team), a = canon(ev.away_team);
  const match = matches.find((m) => (canon(m.home_team) === h && canon(m.away_team) === a) || (canon(m.home_team) === a && canon(m.away_team) === h));
  if (!match || !ev.commence_time) continue;
  if (new Date(match.kickoff).getTime() === new Date(ev.commence_time).getTime()) continue;
  if (samples.length < 6) samples.push(`${match.home_team} v ${match.away_team}: ${TO(match.kickoff)}  ->  ${TO(ev.commence_time)}`);
  await db.from("matches").update({ kickoff: new Date(ev.commence_time).toISOString() }).eq("id", match.id);
  updated++;
}
console.log("kickoffs updated:", updated);
console.log("examples (old -> new, Toronto time):");
samples.forEach((s) => console.log("  " + s));
process.exit(0);
