"use client";
import { Fragment, useEffect, useState } from "react";
import Flag from "@/app/Flag";

interface Row {
  name: string;
  points: number;
  correct: number;
  wildcardsHit: number;
  avgPerCorrect: number;
  max: number;
  predictions: number;
  champion: string | null;
  rideTeams: string[];
  goldenBoot: string | null;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [groupGames, setGroupGames] = useState(72);
  const [wildcardsMax, setWildcardsMax] = useState(3);
  const [teamValues, setTeamValues] = useState<Record<string, number>>({});
  const [championBonus, setChampionBonus] = useState(50);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        if (d.groupGames) setGroupGames(d.groupGames);
        if (d.wildcardsMax) setWildcardsMax(d.wildcardsMax);
        if (d.teamValues) setTeamValues(d.teamValues);
        if (d.championBonus != null) setChampionBonus(d.championBonus);
      })
      .catch(() => setRows([]));
  }, []);

  if (!rows) return <p className="text-slate-500">Loading leaderboard…</p>;
  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  const teamTag = (t: string, champion = false) => (
    <span key={t} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1.5 py-0.5">
      <Flag team={t} className="w-4" /> {t}
      {teamValues[t] != null && (
        <span className="text-slate-400">({champion ? `${championBonus} + ${teamValues[t]}` : teamValues[t]})</span>
      )}
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Leaderboard</h1>
      <p className="text-sm text-slate-500 mb-4">
        <b>Points</b> = locked in. <b>Correct</b> = group games right. <b>⭐</b> = wildcards hit.
        <b> Avg</b> = points per correct pick. <b>Max</b> = ceiling if every remaining pick hits.
        <br />Tap a row to see that player&apos;s knockout picks. 👀
      </p>
      {rows.length === 0 ? (
        <p className="text-slate-500">No players yet — be the first to join and pick!</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2 w-10">#</th>
                <th className="text-left px-3 py-2">Player</th>
                <th className="text-right px-3 py-2">Points</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">Correct</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">⭐</th>
                <th className="text-right px-3 py-2 whitespace-nowrap">Avg</th>
                <th className="text-right px-3 py-2">Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const expanded = open === r.name;
                return (
                  <Fragment key={r.name}>
                    <tr
                      onClick={() => setOpen(expanded ? null : r.name)}
                      className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${i < 3 ? "font-semibold" : ""}`}
                    >
                      <td className="px-3 py-2.5">{medal(i)}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-slate-400 mr-1">{expanded ? "▾" : "▸"}</span>
                        {r.name}
                        <span className="text-xs text-slate-400 font-normal ml-2">{r.predictions} picks</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-pitch font-bold">{r.points}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">{r.correct} / {groupGames}</td>
                      <td className="px-3 py-2.5 text-right text-amber-600 whitespace-nowrap">{r.wildcardsHit} / {wildcardsMax}</td>
                      <td className="px-3 py-2.5 text-right text-slate-600">{r.avgPerCorrect.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{r.max}</td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/70 border-t border-slate-100">
                        <td className="px-3 pb-3 pt-1" colSpan={7}>
                          <div className="flex flex-col gap-2 text-xs text-slate-600">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="uppercase tracking-wide text-slate-400 w-24 shrink-0">🏆 Champion</span>
                              {r.champion ? teamTag(r.champion, true) : <span className="text-slate-400">—</span>}
                            </div>
                            <div className="flex items-start gap-2 flex-wrap">
                              <span className="uppercase tracking-wide text-slate-400 w-24 shrink-0">🎟️ Ride</span>
                              <span className="flex flex-wrap gap-1.5">
                                {r.rideTeams.length ? r.rideTeams.map(teamTag) : <span className="text-slate-400">—</span>}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="uppercase tracking-wide text-slate-400 w-24 shrink-0">👟 Golden Boot</span>
                              {r.goldenBoot ? <span className="font-medium text-slate-700">{r.goldenBoot}</span> : <span className="text-slate-400">—</span>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
