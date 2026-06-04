"use client";
import { useEffect, useState } from "react";

interface Row { name: string; points: number; max: number; predictions: number }

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => setRows(d.rows ?? [])).catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="text-slate-500">Loading leaderboard…</p>;
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-sm text-slate-500 mb-4">
        <b>Points</b> = locked in so far. <b>Max</b> = your ceiling if every remaining pick hits —
        a high Max means you&apos;re backing underdogs. 🚀
      </p>
      {rows.length === 0 ? (
        <p className="text-slate-500">No players yet — be the first to join and pick!</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2 w-12">#</th>
                <th className="text-left px-4 py-2">Player</th>
                <th className="text-right px-4 py-2">Points</th>
                <th className="text-right px-4 py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name} className={`border-t border-slate-100 ${i < 3 ? "font-semibold" : ""}`}>
                  <td className="px-4 py-2.5">{medal(i)}</td>
                  <td className="px-4 py-2.5">
                    {r.name}
                    <span className="text-xs text-slate-400 font-normal ml-2">{r.predictions} picks</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-pitch font-bold">{r.points}</td>
                  <td className="px-4 py-2.5 text-right text-slate-500">{r.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
