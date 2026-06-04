"use client";
import { useState } from "react";
import Flag from "@/app/Flag";
import { RIDE_ROUND_LABELS, RideRound, Team } from "@/lib/types";

const ROUNDS: RideRound[] = ["group", "r32", "r16", "qf", "sf", "final", "champion"];

export default function AdminTeamRow({ team }: { team: Team }) {
  const [furthest, setFurthest] = useState<RideRound>(team.furthest);
  const [eliminated, setEliminated] = useState(team.eliminated);
  const [msg, setMsg] = useState("");

  async function save(nextFurthest: RideRound, nextElim: boolean) {
    setFurthest(nextFurthest);
    setEliminated(nextElim);
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: team.name, furthest: nextFurthest, eliminated: nextElim }),
    });
    setMsg(res.ok ? "✓" : "err");
    setTimeout(() => setMsg(""), 1200);
  }

  return (
    <div className="flex items-center gap-2 text-sm border border-slate-200 rounded-lg px-3 py-1.5">
      <Flag team={team.name} className="w-5" />
      <span className="flex-1 truncate">{team.name}</span>
      <span className="text-xs text-slate-400">{team.champ_base}</span>
      <select value={furthest} onChange={(e) => save(e.target.value as RideRound, eliminated)}
        className="border border-slate-300 rounded px-1.5 py-1 text-xs">
        {ROUNDS.map((r) => <option key={r} value={r}>{RIDE_ROUND_LABELS[r]}</option>)}
      </select>
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={eliminated} onChange={(e) => save(furthest, e.target.checked)} /> out
      </label>
      <span className="text-xs text-pitch w-3">{msg}</span>
    </div>
  );
}
