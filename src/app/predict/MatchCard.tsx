"use client";
import { useState } from "react";
import { Match, Prediction, Result } from "@/lib/types";
import { matchResult } from "@/lib/scoring";
import Flag from "@/app/Flag";
import OddsBar from "./OddsBar";

export type UiMatch = Match & { locked: boolean };

export default function MatchCard({
  match,
  pred,
  wildcardsLeft,
  onSaved,
}: {
  match: UiMatch;
  pred?: Prediction;
  wildcardsLeft: number; // remaining, not counting this card
  onSaved: (p: Prediction) => void;
}) {
  const [pick, setPick] = useState<Result | undefined>(pred?.pick);
  const [wild, setWild] = useState<boolean>(pred?.wildcard ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const locked = match.locked || match.finished;
  const actual = matchResult(match);
  const mult = wild ? 5 : 1;
  const canWild = !locked && !!pick && (wild || wildcardsLeft > 0);

  const kickoff = new Date(match.kickoff).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  const baseValue = (r: Result) => (r === "home" ? match.pts_home : r === "away" ? match.pts_away : match.pts_draw);

  async function save(nextPick: Result, nextWild: boolean) {
    if (locked) return;
    setErr("");
    setBusy(true);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id, pick: nextPick, wildcard: nextWild }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json()).error ?? "Could not save.");
      return;
    }
    setPick(nextPick);
    setWild(nextWild);
    onSaved({ player_id: pred?.player_id ?? "", match_id: match.id, pick: nextPick, wildcard: nextWild, points: 0 });
  }

  const labels: Record<Result, string> = { home: match.home_team, draw: "Draw", away: match.away_team };

  const btn = (r: Result) => {
    const selected = pick === r;
    const isActual = actual === r;
    let cls = "bg-white border-slate-300 hover:bg-slate-50";
    let caption: string | null = null; // shown when the match is final
    if (match.finished) {
      if (isActual) {
        cls = "bg-green-50 border-green-500 text-green-800"; // the winning outcome
        caption = selected ? "✓ Your pick" : "✓ Winner";
      } else if (selected) {
        cls = "bg-rose-50 border-rose-400 text-rose-700"; // your pick, but it lost
        caption = "✗ Your pick";
      } else {
        cls = "bg-white border-slate-200 text-slate-400 opacity-70";
      }
    } else if (selected) {
      cls = "bg-pitch text-white border-pitch";
    }
    const v = baseValue(r);
    return (
      <button key={r} type="button" disabled={locked || busy} onClick={() => save(r, wild)}
        className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition disabled:cursor-default ${cls}`}>
        <span className="flex items-center justify-center gap-1.5">
          {r === "home" && <Flag team={match.home_team} className="w-5" />}
          <span className="truncate">{r === "draw" ? "Draw" : labels[r]}</span>
          {r === "away" && <Flag team={match.away_team} className="w-5" />}
        </span>
        <span className={`block text-xs font-semibold ${selected && !match.finished ? "text-white/80" : "text-current opacity-90"}`}>
          {match.finished ? (caption ?? " ") : v == null ? "—" : `${v * mult} pt${v * mult === 1 ? "" : "s"}`}
        </span>
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-xl border p-3 ${wild ? "border-amber-300 ring-1 ring-amber-300" : "border-slate-200"} ${locked ? "" : "shadow-sm"}`}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="font-medium">Group {match.group_label} · {kickoff}</span>
        {match.finished ? (
          <span className="text-pitch font-semibold">
            Final {match.home_goals}–{match.away_goals}
            {pick && (actual === pick ? ` · +${pred?.points ?? 0}` : " · 0 pts")}
          </span>
        ) : match.locked ? (
          <span className="text-amber-600 font-semibold">🔒 Locked</span>
        ) : busy ? (
          <span className="text-slate-400">saving…</span>
        ) : pick ? (
          <span className="text-pitch">✓ picked</span>
        ) : (
          <span className="text-slate-400">tap to pick</span>
        )}
      </div>

      <div className="flex gap-2">{(["home", "draw", "away"] as Result[]).map(btn)}</div>

      {match.prob_home != null && (
        <div className="mt-2.5">
          <OddsBar home={match.prob_home} draw={match.prob_draw} away={match.prob_away}
            homeTeam={match.home_team} awayTeam={match.away_team} />
        </div>
      )}

      {!locked && (
        <div className="mt-2 flex items-center justify-between">
          <button type="button" disabled={!canWild || busy} onClick={() => save(pick!, !wild)}
            className={`text-xs font-semibold rounded-md px-2.5 py-1 border transition disabled:opacity-40 ${
              wild ? "bg-amber-400 border-amber-400 text-amber-950" : "bg-white border-slate-300 hover:bg-amber-50"
            }`}>
            ⭐ {wild ? "5× wildcard ON" : "Make 5× wildcard"}
          </button>
          {!pick && <span className="text-[11px] text-slate-400">pick a result first</span>}
        </div>
      )}
      {match.finished && wild && <p className="text-[11px] text-amber-600 mt-1">⭐ wildcard game (5×)</p>}
      {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
    </div>
  );
}
