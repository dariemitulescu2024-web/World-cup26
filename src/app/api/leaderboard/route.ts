import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { getSettings, getTeamsMap } from "@/lib/recompute";
import { groupPickMax, maxEntry } from "@/lib/scoring";
import { Entry, Match, Prediction } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase caps a single select at 1000 rows — page through everything.
async function allRows<T>(db: SupabaseClient, table: string, columns = "*"): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let from = 0; ; from += size) {
    const { data, error } = await db.from(table).select(columns).range(from, from + size - 1);
    if (error || !data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < size) break;
  }
  return out;
}

export async function GET() {
  const db = admin();
  const settings = await getSettings();
  const teams = await getTeamsMap();

  const { data: players } = await db.from("players").select("id, name");
  const { data: matchesRaw } = await db.from("matches").select("*").eq("stage", "group");
  const predsRaw = await allRows<Prediction>(db, "predictions");
  const entriesRaw = await allRows<Entry>(db, "entries");

  const matchById: Record<string, Match> = {};
  for (const m of (matchesRaw ?? []) as Match[]) matchById[m.id] = m;

  const gPts: Record<string, number> = {};
  const gMax: Record<string, number> = {};
  const counts: Record<string, number> = {};
  const correct: Record<string, number> = {};
  const wildHit: Record<string, number> = {};
  for (const p of predsRaw) {
    const m = matchById[p.match_id];
    if (!m) continue;
    gPts[p.player_id] = (gPts[p.player_id] ?? 0) + (p.points ?? 0);
    gMax[p.player_id] = (gMax[p.player_id] ?? 0) + groupPickMax(p, m, settings.scoring);
    counts[p.player_id] = (counts[p.player_id] ?? 0) + 1;
    if ((p.points ?? 0) > 0) {
      correct[p.player_id] = (correct[p.player_id] ?? 0) + 1; // finished, correct pick scores > 0
      if (p.wildcard) wildHit[p.player_id] = (wildHit[p.player_id] ?? 0) + 1; // a wildcard that landed
    }
  }
  const groupGames = (matchesRaw ?? []).length;
  const wildcardsMax = settings.scoring.wildcards ?? 3;

  const ePts: Record<string, number> = {};
  const eMax: Record<string, number> = {};
  const entryById: Record<string, Entry> = {};
  for (const e of entriesRaw) {
    ePts[e.player_id] = e.points ?? 0;
    eMax[e.player_id] = maxEntry(e, teams, settings.golden_boot_result, settings.scoring);
    entryById[e.player_id] = e;
  }

  const rows = (players ?? [])
    .map((pl) => {
      const points = (gPts[pl.id] ?? 0) + (ePts[pl.id] ?? 0);
      const max = (gMax[pl.id] ?? 0) + (eMax[pl.id] ?? 0);
      const c = correct[pl.id] ?? 0;
      const e = entryById[pl.id];
      return {
        name: pl.name,
        points,
        correct: c,
        wildcardsHit: wildHit[pl.id] ?? 0,
        avgPerCorrect: c > 0 ? Math.round(((gPts[pl.id] ?? 0) / c) * 10) / 10 : 0, // group pts ÷ correct picks, 1dp
        max,
        predictions: counts[pl.id] ?? 0,
        // Knockout picks (locked at tournament start, so safe to reveal)
        champion: e?.champion ?? null,
        rideTeams: e?.ride_teams ?? [],
        goldenBoot: e?.golden_boot ?? null,
      };
    })
    .sort((a, b) => b.points - a.points || b.max - a.max);

  const teamValues: Record<string, number> = {};
  for (const t of Object.values(teams)) teamValues[t.name] = t.champ_base;

  return NextResponse.json({
    rows,
    groupGames,
    wildcardsMax,
    teamValues,
    championBonus: settings.scoring.championBonus ?? 50,
  });
}
