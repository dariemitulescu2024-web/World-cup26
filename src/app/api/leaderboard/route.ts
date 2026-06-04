import { NextResponse } from "next/server";
import { admin } from "@/lib/supabaseAdmin";

export async function GET() {
  const db = admin();
  const { data: players } = await db.from("players").select("id, name");
  const { data: preds } = await db.from("predictions").select("player_id, points");
  const { data: bonuses } = await db.from("bonus_predictions").select("player_id, points");

  const matchPts: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const p of preds ?? []) {
    matchPts[p.player_id] = (matchPts[p.player_id] ?? 0) + (p.points ?? 0);
    counts[p.player_id] = (counts[p.player_id] ?? 0) + 1;
  }
  const bonusPts: Record<string, number> = {};
  for (const b of bonuses ?? []) bonusPts[b.player_id] = b.points ?? 0;

  const rows = (players ?? [])
    .map((pl) => ({
      name: pl.name,
      matchPoints: matchPts[pl.id] ?? 0,
      bonusPoints: bonusPts[pl.id] ?? 0,
      total: (matchPts[pl.id] ?? 0) + (bonusPts[pl.id] ?? 0),
      predictions: counts[pl.id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total || b.predictions - a.predictions);

  return NextResponse.json({ rows });
}
