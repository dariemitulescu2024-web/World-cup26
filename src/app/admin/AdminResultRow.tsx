"use client";
import { useState } from "react";
import Flag from "@/app/Flag";
import { Match } from "@/lib/types";

export default function AdminResultRow({ match }: { match: Match }) {
  const [hg, setHg] = useState(match.home_goals?.toString() ?? "");
  const [ag, setAg] = useState(match.away_goals?.toString() ?? "");
  const [msg, setMsg] = useState("");

  async function save(finished: boolean) {
    setMsg("");
    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: match.id, finished, home_goals: Number(hg), away_goals: Number(ag) }),
    });
    const d = await res.json();
    setMsg(res.ok ? (finished ? "Saved ✓" : "Cleared ✓") : d.error ?? "Error");
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 text-sm flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-400 w-10">#{match.match_no}</span>
      <span className="flex items-center gap-1.5 w-44 justify-end truncate">
        <span className="truncate">{match.home_team}</span> <Flag team={match.home_team} className="w-5" />
      </span>
      <input type="number" min={0} value={hg} onChange={(e) => setHg(e.target.value)}
        placeholder="H" className="border border-slate-300 rounded px-2 py-1 w-12 text-center" />
      <span>–</span>
      <input type="number" min={0} value={ag} onChange={(e) => setAg(e.target.value)}
        placeholder="A" className="border border-slate-300 rounded px-2 py-1 w-12 text-center" />
      <span className="flex items-center gap-1.5 w-44 truncate">
        <Flag team={match.away_team} className="w-5" /> <span className="truncate">{match.away_team}</span>
      </span>
      <button onClick={() => save(true)}
        className="bg-pitch text-white rounded px-3 py-1 font-semibold hover:bg-pitch-dark">Save</button>
      {match.finished && (
        <button onClick={() => save(false)} className="text-xs text-red-600 hover:underline">clear</button>
      )}
      {match.finished && <span className="text-xs text-pitch font-semibold">FINAL {match.home_goals}–{match.away_goals}</span>}
      {msg && <span className="text-xs text-slate-500">{msg}</span>}
    </div>
  );
}
