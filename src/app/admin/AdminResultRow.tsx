"use client";
import { useState } from "react";
import Flag from "@/app/Flag";
import { Match, Side } from "@/lib/types";

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AdminResultRow({ match }: { match: Match }) {
  const isPlaceholder = match.stage !== "group" && /\d[AB]$/.test(match.home_team);
  const [hg, setHg] = useState(match.home_goals?.toString() ?? "");
  const [ag, setAg] = useState(match.away_goals?.toString() ?? "");
  const [firstTeam, setFirstTeam] = useState<Side | "">(match.first_team ?? "");
  const isKnockout = match.stage !== "group";
  const [advancing, setAdvancing] = useState<"home" | "away" | "">(match.advancing ?? "");
  const [homeTeam, setHomeTeam] = useState(match.home_team);
  const [awayTeam, setAwayTeam] = useState(match.away_team);
  const [kickoff, setKickoff] = useState(toLocalInput(match.kickoff));
  const [msg, setMsg] = useState("");

  async function saveResult(finished: boolean) {
    setMsg("");
    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: match.id,
        finished,
        home_goals: Number(hg),
        away_goals: Number(ag),
        first_team: firstTeam || null,
        advancing: advancing || null,
      }),
    });
    const d = await res.json();
    setMsg(res.ok ? (finished ? "Saved ✓" : "Cleared ✓") : d.error ?? "Error");
  }

  async function saveFixture() {
    setMsg("");
    const res = await fetch("/api/admin/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match_id: match.id,
        home_team: homeTeam,
        away_team: awayTeam,
        kickoff: new Date(kickoff).toISOString(),
      }),
    });
    const d = await res.json();
    setMsg(res.ok ? "Fixture updated ✓" : d.error ?? "Error");
  }

  return (
    <div className="border border-slate-200 rounded-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-400">
          #{match.match_no} · {match.stage}{match.group_label ? ` ${match.group_label}` : ""}
        </span>
        {match.finished && <span className="text-xs text-pitch font-semibold">FINAL</span>}
      </div>

      {/* Fixture edit (teams + kickoff) — handy for knockout placeholders */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input value={homeTeam} onChange={(e) => setHomeTeam(e.target.value)}
          className={`border rounded px-2 py-1 w-36 ${isPlaceholder ? "border-amber-300 bg-amber-50" : "border-slate-300"}`} />
        <span className="inline-flex items-center gap-1 text-slate-400">
          <Flag team={homeTeam} className="w-5" /> v <Flag team={awayTeam} className="w-5" />
        </span>
        <input value={awayTeam} onChange={(e) => setAwayTeam(e.target.value)}
          className={`border rounded px-2 py-1 w-36 ${isPlaceholder ? "border-amber-300 bg-amber-50" : "border-slate-300"}`} />
        <input type="datetime-local" value={kickoff} onChange={(e) => setKickoff(e.target.value)}
          className="border border-slate-300 rounded px-2 py-1" />
        <button onClick={saveFixture} className="text-xs bg-slate-200 rounded px-2 py-1 hover:bg-slate-300">
          Update fixture
        </button>
      </div>

      {/* Result entry */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="number" min={0} value={hg} onChange={(e) => setHg(e.target.value)}
          placeholder="H" className="border border-slate-300 rounded px-2 py-1 w-14 text-center" />
        <span>–</span>
        <input type="number" min={0} value={ag} onChange={(e) => setAg(e.target.value)}
          placeholder="A" className="border border-slate-300 rounded px-2 py-1 w-14 text-center" />
        <select value={firstTeam} onChange={(e) => setFirstTeam(e.target.value as Side)}
          className="border border-slate-300 rounded px-2 py-1">
          <option value="">first to score…</option>
          <option value="home">Home first</option>
          <option value="away">Away first</option>
          <option value="none">0–0 (none)</option>
        </select>
        {isKnockout && (
          <select value={advancing} onChange={(e) => setAdvancing(e.target.value as "home" | "away")}
            className="border border-slate-300 rounded px-2 py-1">
            <option value="">advances…</option>
            <option value="home">Home advances</option>
            <option value="away">Away advances</option>
          </select>
        )}
        <button onClick={() => saveResult(true)}
          className="bg-pitch text-white rounded px-3 py-1 font-semibold hover:bg-pitch-dark">
          Save result
        </button>
        {match.finished && (
          <button onClick={() => saveResult(false)}
            className="text-xs text-red-600 hover:underline">clear</button>
        )}
        {msg && <span className="text-xs text-slate-500">{msg}</span>}
      </div>
    </div>
  );
}
