// Seeds settings + all 104 fixtures (72 group + 32 knockout) into Supabase.
// Usage: node scripts/seed.mjs   (reads SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// from .env.local). Safe to re-run — it upserts on match_no.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local ---------------------------------------------------------
try {
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* .env.local optional if vars already set */
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const GROUPS = {
  A: ["Mexico", "South Africa", "South Korea", "Czech Republic"],
  B: ["Canada", "Bosnia and Herzegovina", "Qatar", "Switzerland"],
  C: ["Brazil", "Morocco", "Haiti", "Scotland"],
  D: ["United States", "Paraguay", "Australia", "Turkey"],
  E: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"],
  F: ["Netherlands", "Japan", "Sweden", "Tunisia"],
  G: ["Belgium", "Egypt", "Iran", "New Zealand"],
  H: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"],
  I: ["France", "Senegal", "Iraq", "Norway"],
  J: ["Argentina", "Algeria", "Austria", "Jordan"],
  K: ["Portugal", "DR Congo", "Uzbekistan", "Colombia"],
  L: ["England", "Croatia", "Ghana", "Panama"],
};

const SCORING = {
  groupBase: 3,
  groupMinPoints: 1,
  rideMultiplier: { group: 0, r32: 0, r16: 1, qf: 2, sf: 3, final: 4, champion: 5 },
  rideTeams: 3,
  goldenBoot: 30,
  championBonus: 50,
};

// kickoff helper: a Date at the given month/day/hour UTC in 2026.
const at = (month, day, hour) =>
  new Date(Date.UTC(2026, month - 1, day, hour, 0, 0)).toISOString();

const matches = [];
let no = 0;

// --- group stage: round-robin, 6 matches per group ---------------------------
const RR = [
  [0, 1],
  [2, 3],
  [0, 2],
  [1, 3],
  [0, 3],
  [1, 2],
];
const groupLetters = Object.keys(GROUPS);
groupLetters.forEach((g, gi) => {
  const t = GROUPS[g];
  RR.forEach((pair, idx) => {
    const md = Math.floor(idx / 2); // 0,1,2 -> matchday 1,2,3
    const base = [11, 16, 22][md]; // June 11 / 16 / 22
    const day = base + (gi % 5);
    const hour = [16, 19, 22][gi % 3];
    matches.push({
      match_no: ++no,
      stage: "group",
      group_label: g,
      home_team: t[pair[0]],
      away_team: t[pair[1]],
      kickoff: at(6, day, hour),
      venue: null,
    });
  });
});

// --- knockout placeholders (teams filled in by admin once known) -------------
function knockout(stage, count, label, month, startDay, endDay) {
  for (let i = 1; i <= count; i++) {
    const span = endDay - startDay;
    const day = startDay + (count > 1 ? Math.round((span * (i - 1)) / (count - 1)) : 0);
    matches.push({
      match_no: ++no,
      stage,
      group_label: null,
      home_team: `${label} ${i}A`,
      away_team: `${label} ${i}B`,
      kickoff: at(month, Math.min(day, endDay), i % 2 ? 19 : 22),
      venue: null,
    });
  }
}
knockout("r32", 16, "R32", 6, 28, 30); // 28-30 Jun + spill handled below
// adjust the last r32 dates into early July for realism
knockout("r16", 8, "R16", 7, 4, 7);
knockout("qf", 4, "QF", 7, 9, 11);
knockout("sf", 2, "SF", 7, 14, 15);
knockout("third", 1, "3rd place", 7, 18, 18);
knockout("final", 1, "Final", 7, 19, 19);

// --- write -------------------------------------------------------------------
const { error: sErr } = await db
  .from("settings")
  .upsert({ id: 1, join_code: "WORLDCUP26", scoring: SCORING }, { onConflict: "id" });
if (sErr) {
  console.error("settings upsert failed:", sErr.message);
  process.exit(1);
}

const { error: mErr } = await db
  .from("matches")
  .upsert(matches, { onConflict: "match_no" });
if (mErr) {
  console.error("matches upsert failed:", mErr.message);
  process.exit(1);
}

console.log(
  `Seeded settings + ${matches.length} matches ` +
    `(${matches.filter((m) => m.stage === "group").length} group, ` +
    `${matches.filter((m) => m.stage !== "group").length} knockout).`,
);
