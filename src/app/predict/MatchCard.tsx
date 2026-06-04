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
  onSaved,
}: {
  match: UiMatch;
  pred?: Prediction;
  onSaved: (p: Prediction) => void;
}) {
  const [pick, setPick] = useState<Result | undefined>(pred?.pick);
  const [saving, setSaving] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  const locked = match.locked || match.finished;
  const actual = matchResult(match);

  const kickoff = new Date(match.kickoff).toLocaleString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  const value = (r: Result) => (r === "home" ? match.pts_home : r === "away" ? match.pts_away : match.pts_draw);

  async function choose(r: Result) {
    if (locked) return;
    setErr("");
    setSaving(r);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id, pick: r }),
    });
    setSaving(null);
    if (!res.ok) {
      const d = await res.json();
      setErr(d.error ?? "Could not save.");
      return;
    }
    setPick(r);
    onSaved({ player_id: pred?.player_id ?? "", match_id: match.id, pick: r, points: 0 });
  }

  const labels: Record<Result, string> = {
    home: match.home_team,
    draw: "Draw",
    away: match.away_team,
  };

  const btn = (r: Result) => {
    const selected = pick === r;
    const isActual = actual === r;
    let cls = "bg-white border-slate-300 hover:bg-slate-50";
    if (match.finished) {
      if (selected && isActual) cls = "bg-pitch text-white border-pitch"; // correct pick
      else if (selected) cls = "bg-rose-50 border-rose-300 text-rose-700"; // wrong pick
      else if (isActual) cls = "border-pitch/40"; // the actual result
    } else if (selected) {
      cls = "bg-pitch text-white border-pitch";
    }
    return (
      <button
        key={r}
        type="button"
        disabled={locked || saving !== null}
        onClick={() => choose(r)}
        className={`flex-1 rounded-lg border px-2 py-2 text-sm font-medium transition disabled:cursor-default ${cls}`}
      >
        <span className="flex items-center justify-center gap-1.5">
          {r === "home" && <Flag team={match.home_team} className="w-5" />}
          <span className="truncate">{r === "draw" ? "Draw" : labels[r]}</span>
          {r === "away" && <Flag team={match.away_team} className="w-5" />}
        </span>
        <span className={`block text-xs ${selected && !match.finished ? "text-white/80" : "text-slate-500"}`}>
          {value(r) ?? "—"} pt{value(r) === 1 ? "" : "s"}
        </span>
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-xl border p-3 ${locked ? "border-slate-200" : "border-slate-200 shadow-sm"}`}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="font-medium">Group {match.group_label} · {kickoff}</span>
        {match.finished ? (
          <span className="text-pitch font-semibold">
            Final {match.home_goals}–{match.away_goals}
            {pick && (actual === pick ? ` · +${pred?.points ?? value(pick) ?? 0}` : " · 0 pts")}
          </span>
        ) : match.locked ? (
          <span className="text-amber-600 font-semibold">🔒 Locked</span>
        ) : saving ? (
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
          <OddsBar
            home={match.prob_home}
            draw={match.prob_draw}
            away={match.prob_away}
            homeTeam={match.home_team}
            awayTeam={match.away_team}
          />
        </div>
      )}
      {err && <p className="text-red-600 text-xs mt-1">{err}</p>}
    </div>
  );
}
