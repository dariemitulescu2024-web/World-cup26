// Auto-import via Gemini + Google Search grounding: group match scores and
// knockout team progress. Never overwrites a match an admin already entered.
import { admin } from "./supabaseAdmin";
import { recomputeEntries, recomputeMatch } from "./recompute";
import { norm } from "./scoring";
import { ALL_TEAMS } from "./teams";
import type { Match, RideRound } from "./types";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TOURNAMENT = process.env.TOURNAMENT_NAME || "2026 FIFA World Cup";
const SETTLE_MS = 2.5 * 60 * 60 * 1000;
const MAX_PER_RUN = 24;
const CONCURRENCY = 5;
const ROUNDS: RideRound[] = ["group", "r32", "r16", "qf", "sf", "final", "champion"];

async function gemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${GEMINI}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p?.text ?? "").join("");
  } catch {
    return null;
  }
}

function parseJson(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** Final score of one group match (or {finished:false}). */
async function fetchScore(match: Match): Promise<{ home_goals: number; away_goals: number } | null> {
  const date = new Date(match.kickoff).toISOString().slice(0, 10);
  const text = await gemini(
    `Using up-to-date web sources, report the final score of this ${TOURNAMENT} group match.
Match: ${match.home_team} vs ${match.away_team}, played around ${date}.
If it has NOT finished or you cannot confirm a final score, return {"finished": false}.
Respond with ONLY JSON: {finished (bool), home_goals (int), away_goals (int)}. No markdown.`,
  );
  const p = parseJson(text);
  if (!p || !p.finished) return null;
  const hg = Number(p.home_goals);
  const ag = Number(p.away_goals);
  if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0) return null;
  return { home_goals: hg, away_goals: ag };
}

/** Import finished group scores. */
export async function importGroupResults(): Promise<{ checked: number; updated: number }> {
  const db = admin();
  const cutoff = Date.now() - SETTLE_MS;
  const { data } = await db.from("matches").select("*").eq("stage", "group").eq("finished", false);
  const candidates = ((data ?? []) as Match[])
    .filter((m) => new Date(m.kickoff).getTime() < cutoff)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, MAX_PER_RUN);

  let updated = 0;
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((m) => fetchScore(m).then((r) => ({ m, r })).catch(() => ({ m, r: null }))),
    );
    for (const { m, r } of results) {
      if (!r) continue;
      await db
        .from("matches")
        .update({ finished: true, home_goals: r.home_goals, away_goals: r.away_goals })
        .eq("id", m.id)
        .eq("finished", false);
      await recomputeMatch(m.id);
      updated++;
    }
  }
  return { checked: candidates.length, updated };
}

/** Update each team's furthest knockout round + eliminated status. */
export async function importTeamProgress(): Promise<{ updated: number }> {
  const text = await gemini(
    `Using up-to-date web sources, report each team's status in the ${TOURNAMENT} as of now.
For EACH team give:
- "furthest": the furthest round it has reached so far — "group", "r32", "r16", "qf", "sf", "final", or "champion".
- "eliminated": true if the team is OUT of the tournament — this INCLUDES teams already knocked out OR mathematically unable to advance from the group stage — and false if it is still alive (still in the group with a chance, or still active in the knockouts).
During the group stage: a team still able to advance is {"furthest":"group","eliminated":false}; a team already out in the group stage is {"furthest":"group","eliminated":true}.
Only set eliminated=true if you can confirm the team is out; if unsure, use false.
Teams: ${ALL_TEAMS.join(", ")}.
Respond with ONLY a JSON object mapping each exact team name to {"furthest": <round>, "eliminated": <bool>}. No markdown.`,
  );
  const parsed = parseJson(text);
  if (!parsed) return { updated: 0 };
  const db = admin();
  const { data: teams } = await db.from("teams").select("name, furthest, eliminated");
  let updated = 0;
  for (const t of teams ?? []) {
    // find the parsed entry by normalized name
    const entry = Object.entries(parsed).find(([k]) => norm(k) === norm(t.name))?.[1] as
      | { furthest?: string; eliminated?: boolean }
      | undefined;
    if (!entry) continue;
    const furthest = ROUNDS.includes(entry.furthest as RideRound) ? (entry.furthest as RideRound) : "group";
    const eliminated = !!entry.eliminated;
    if (furthest !== t.furthest || eliminated !== t.eliminated) {
      await db.from("teams").update({ furthest, eliminated }).eq("name", t.name);
      updated++;
    }
  }
  if (updated > 0) await recomputeEntries();
  return { updated };
}

/** Full import run: group scores + team progress. */
export async function importResults(): Promise<{ checked: number; updated: number; teamsUpdated: number }> {
  if (!process.env.GEMINI_API_KEY) return { checked: 0, updated: 0, teamsUpdated: 0 };
  const g = await importGroupResults();
  const t = await importTeamProgress();
  return { checked: g.checked, updated: g.updated, teamsUpdated: t.updated };
}
