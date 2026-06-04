import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";
import { getSettings, getTeamsMap } from "@/lib/recompute";
import { groupPickMax, maxEntry } from "@/lib/scoring";
import { Entry, Match, Prediction } from "@/lib/types";

export async function GET() {
  const db = admin();
  const settings = await getSettings();
  const teams = await getTeamsMap();

  const { data: players } = await db.from("players").select("id, name");
  const { data: matchesRaw } = await db.from("matches").select("*").eq("stage", "group");
  const { data: predsRaw } = await db.from("predictions").select("*");
  const { data: entriesRaw } = await db.from("entries").select("*");

  const matchById: Record<string, Match> = {};
  for (const m of (matchesRaw ?? []) as Match[]) matchById[m.id] = m;

  // Group points + group max per player
  const gPts: Record<string, number> = {};
  const gMax: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const p of (predsRaw ?? []) as Prediction[]) {
    const m = matchById[p.match_id];
    if (!m) continue;
    gPts[p.player_id] = (gPts[p.player_id] ?? 0) + (p.points ?? 0);
    gMax[p.player_id] = (gMax[p.player_id] ?? 0) + groupPickMax(p, m);
    counts[p.player_id] = (counts[p.player_id] ?? 0) + 1;
  }

  // Entry points (stored) + entry max
  const ePts: Record<string, number> = {};
  const eMax: Record<string, number> = {};
  for (const e of (entriesRaw ?? []) as Entry[]) {
    ePts[e.player_id] = e.points ?? 0;
    eMax[e.player_id] = maxEntry(e, teams, settings.golden_boot_result, settings.scoring);
  }

  const rows = (players ?? [])
    .map((pl) => {
      const points = (gPts[pl.id] ?? 0) + (ePts[pl.id] ?? 0);
      const max = (gMax[pl.id] ?? 0) + (eMax[pl.id] ?? 0);
      return { name: pl.name, points, max, predictions: counts[pl.id] ?? 0 };
    })
    .sort((a, b) => b.points - a.points || b.max - a.max);

  return NextResponse.json({ rows });
}
