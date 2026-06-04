"use client";
import { useState, type ReactNode } from "react";
import { Match, Prediction, Side, Wildcard } from "@/lib/types";
import Flag from "@/app/Flag";
import OddsBar from "./OddsBar";

export type UiMatch = Match & { locked: boolean };

export default function MatchCard({
  match,
  pred,
  doublesLeft,
  onSaved,
}: {
  match: UiMatch;
  pred?: Prediction;
  doublesLeft: number; // remaining, not counting this card
  onSaved: (p: Prediction) => void;
}) {
  const isGroup = match.stage === "group";
  const [home, setHome] = useState<string>(pred ? String(pred.pred_home) : "");
  const [away, setAway] = useState<string>(pred ? String(pred.pred_away) : "");
  const [firstTeam, setFirstTeam] = useState<Side | "">(pred?.pred_first_team ?? "");
  const [wildcard, setWildcard] = useState<Wildcard>(pred?.wildcard ?? "none");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const locked = match.locked || match.finished;

  const canToggleDouble = doublesLeft > 0 || wildcard === "double";

  const kickoff = new Date(match.kickoff).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  async function save() {
    setMsg(null);
    if (home === "" || away === "") {
      setMsg({ ok: false, text: "Enter a score for both teams." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: match.id,
        pred_home: Number(home),
        pred_away: Number(away),
        pred_first_team: firstTeam || null,
        wildcard,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Could not save." });
      return;
    }
    setMsg({ ok: true, text: "Saved ✓" });
    onSaved({
      player_id: pred?.player_id ?? "",
      match_id: match.id,
      pred_home: Number(home),
      pred_away: Number(away),
      pred_first_team: (firstTeam || null) as Side | null,
      wildcard,
      points: data.points ?? 0,
    });
  }

  const teamBtn = (side: Side, label: ReactNode) => {
    const active = firstTeam === side;
    return (
      <button
        type="button"
        disabled={locked}
        onClick={() => setFirstTeam(active ? "" : side)}
        className={`px-2.5 py-1 rounded-md text-xs border transition disabled:opacity-60 ${
          active ? "bg-pitch text-white border-pitch" : "bg-white border-slate-300 hover:bg-slate-50"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${locked ? "border-slate-200 opacity-90" : "border-slate-200 shadow-sm"}`}>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span className="font-medium">
          {isGroup ? `Group ${match.group_label}` : ""} · {kickoff}
        </span>
        {match.finished ? (
          <span className="text-pitch font-semibold">
            Final {match.home_goals}–{match.away_goals} · you got {pred?.points ?? 0} pts
          </span>
        ) : match.locked ? (
          <span className="text-amber-600 font-semibold">🔒 Locked</span>
        ) : (
          <span className="text-slate-400">open</span>
        )}
      </div>

      {/* Teams + score inputs */}
      <div className="flex items-center justify-center gap-3 my-2">
        <div className="flex-1 flex items-center justify-end gap-2 font-semibold truncate">
          <span className="truncate">{match.home_team}</span>
          <Flag team={match.home_team} className="w-7 shrink-0" />
        </div>
        <input
          type="number"
          min={0}
          max={30}
          value={home}
          disabled={locked}
          onChange={(e) => setHome(e.target.value)}
          className="w-12 text-center text-lg font-bold border border-slate-300 rounded-md py-1 disabled:bg-slate-100"
        />
        <span className="text-slate-400">–</span>
        <input
          type="number"
          min={0}
          max={30}
          value={away}
          disabled={locked}
          onChange={(e) => setAway(e.target.value)}
          className="w-12 text-center text-lg font-bold border border-slate-300 rounded-md py-1 disabled:bg-slate-100"
        />
        <div className="flex-1 flex items-center justify-start gap-2 font-semibold truncate">
          <Flag team={match.away_team} className="w-7 shrink-0" />
          <span className="truncate">{match.away_team}</span>
        </div>
      </div>

      <div className="my-3">
        <OddsBar
          home={match.prob_home}
          draw={match.prob_draw}
          away={match.prob_away}
          homeTeam={match.home_team}
          awayTeam={match.away_team}
        />
      </div>

      {!isGroup && (
        <p className="text-[11px] text-slate-400 mb-2">
          Knockout: score judged at 90 min; the result follows whoever advances, so predict a winner
          (a draw earns no result points).
        </p>
      )}

      {/* First team to score */}
      <div className="flex items-center gap-2 text-sm border-t border-slate-100 pt-3">
        <span className="text-slate-500 text-xs">First to score (+1):</span>
        {teamBtn("home", <span className="inline-flex items-center gap-1"><Flag team={match.home_team} className="w-4" /> Home</span>)}
        {teamBtn("none", "0–0")}
        {teamBtn("away", <span className="inline-flex items-center gap-1"><Flag team={match.away_team} className="w-4" /> Away</span>)}
      </div>

      {/* Wildcard (group only) + save */}
      <div className="flex items-center justify-between mt-3">
        <div className="text-sm">
          {isGroup && (
            <label className={`flex items-center gap-2 ${!canToggleDouble || locked ? "opacity-50" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                disabled={locked || !canToggleDouble}
                checked={wildcard === "double"}
                onChange={(e) => setWildcard(e.target.checked ? "double" : "none")}
              />
              <span>🃏 Double this match (2×)</span>
            </label>
          )}
        </div>
        {!locked && (
          <div className="flex items-center gap-2">
            {msg && <span className={`text-xs ${msg.ok ? "text-pitch" : "text-red-600"}`}>{msg.text}</span>}
            <button
              onClick={save}
              disabled={busy}
              className="bg-pitch text-white rounded-md px-4 py-1.5 text-sm font-semibold hover:bg-pitch-dark disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        )}
        {match.finished && pred && (
          <span className="text-xs text-slate-500">
            You: {pred.pred_home}–{pred.pred_away}
          </span>
        )}
      </div>
    </div>
  );
}
