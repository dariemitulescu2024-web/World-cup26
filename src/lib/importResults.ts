// Auto-import match results using Gemini + Google Search grounding.
// Reliable for scorelines; first-scorer/first-team are best-effort. NEVER
// overwrites a match an admin has already marked finished, so manual edits win.
import { admin } from "./supabaseAdmin";
import { recomputeMatch } from "./recompute";
import { norm } from "./scoring";
import type { Advancing, Match, Side } from "./types";

const GEMINI = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const TOURNAMENT = process.env.TOURNAMENT_NAME || "2026 FIFA World Cup";

// Only look at matches whose kickoff was at least this long ago (a match plus
// stoppage/halftime comfortably fits, so we don't query mid-game).
const SETTLE_MS = 2.5 * 60 * 60 * 1000;
const MAX_PER_RUN = 24; // bound work + API usage per invocation
const CONCURRENCY = 5; // keep under Gemini free-tier rate limits

export interface ResultData {
  finished: boolean;
  home_goals: number | null;
  away_goals: number | null;
  first_team: Side | null;
  advancing: Advancing; // knockout only
}

/** Ask Gemini (with web grounding) for a single match's result. */
export async function fetchMatchResult(match: Match): Promise<ResultData | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const date = new Date(match.kickoff).toISOString().slice(0, 10);
  const knockout = match.stage !== "group";
  const prompt = `You are a precise sports-data extractor. Using up-to-date web sources, report the result of this ${TOURNAMENT} match.
Match: ${match.home_team} vs ${match.away_team}, played around ${date}.
Rules:
- If the match was NOT completed yet, or you cannot confirm a final result from reliable sources, return {"finished": false}.
- Report the score at the END OF 90 MINUTES (regulation)${knockout ? ", excluding extra time and penalty shootouts" : ""}.
- "first_team": the exact name "${match.home_team}" or "${match.away_team}" of whichever scored the first goal, or "none" if it was 0-0. For an own goal, the team it counted FOR.${knockout ? `\n- "advanced": the exact name "${match.home_team}" or "${match.away_team}" of the team that advanced to the next round (after extra time / penalties if needed).` : ""}
Respond with ONLY a JSON object with keys: finished (boolean), home_goals (int), away_goals (int), first_team (string)${knockout ? ', advanced (string)' : ''}. No markdown.`;

  let json: unknown;
  try {
    const r = await fetch(`${GEMINI}/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
    });
    if (!r.ok) return null;
    json = await r.json();
  } catch {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts = (json as any)?.candidates?.[0]?.content?.parts ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text: string = parts.map((p: any) => p?.text ?? "").join("");
  const match_json = text.match(/\{[\s\S]*\}/);
  if (!match_json) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match_json[0]);
  } catch {
    return null;
  }

  if (!parsed.finished) {
    return { finished: false, home_goals: null, away_goals: null, first_team: null, advancing: null };
  }
  const hg = Number(parsed.home_goals);
  const ag = Number(parsed.away_goals);
  if (!Number.isInteger(hg) || !Number.isInteger(ag) || hg < 0 || ag < 0 || hg > 30 || ag > 30) {
    return null;
  }

  let side: Side | null = null;
  if (hg + ag === 0) {
    side = "none";
  } else if (typeof parsed.first_team === "string") {
    const n = norm(parsed.first_team);
    if (n === "none") side = "none";
    else if (n === norm(match.home_team)) side = "home";
    else if (n === norm(match.away_team)) side = "away";
  }
  let advancing: Advancing = null;
  if (knockout && typeof parsed.advanced === "string") {
    const n = norm(parsed.advanced);
    if (n === norm(match.home_team)) advancing = "home";
    else if (n === norm(match.away_team)) advancing = "away";
  }

  return { finished: true, home_goals: hg, away_goals: ag, first_team: side, advancing };
}

/** Find recently-played, not-yet-entered matches and fill them in. */
export async function importResults(): Promise<{ checked: number; updated: number; details: string[] }> {
  if (!process.env.GEMINI_API_KEY) {
    return { checked: 0, updated: 0, details: ["GEMINI_API_KEY not set"] };
  }
  const db = admin();
  const cutoff = Date.now() - SETTLE_MS;
  const { data } = await db.from("matches").select("*").eq("finished", false);
  const candidates = ((data ?? []) as Match[])
    .filter((m) => new Date(m.kickoff).getTime() < cutoff)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .slice(0, MAX_PER_RUN);

  const details: string[] = [];
  let updated = 0;

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((m) => fetchMatchResult(m).then((r) => ({ m, r })).catch(() => ({ m, r: null }))),
    );
    for (const { m, r } of results) {
      if (!r || !r.finished) continue;
      await db
        .from("matches")
        .update({
          finished: true,
          home_goals: r.home_goals,
          away_goals: r.away_goals,
          first_team: r.first_team,
          advancing: r.advancing,
        })
        .eq("id", m.id)
        .eq("finished", false); // guard: never clobber a manual entry
      await recomputeMatch(m.id);
      updated++;
      details.push(`${m.home_team} ${r.home_goals}-${r.away_goals} ${m.away_team}`);
    }
  }
  return { checked: candidates.length, updated, details };
}
