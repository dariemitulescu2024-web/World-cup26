"use client";
import { useEffect, useState } from "react";
import { Match, Team } from "@/lib/types";
import AdminResultRow from "./AdminResultRow";
import AdminTeamRow from "./AdminTeamRow";

const GROUPS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [locked, setLocked] = useState(false);
  const [goldenBoot, setGoldenBoot] = useState("");
  const [oddsLockedAt, setOddsLockedAt] = useState<string | null>(null);
  const [players, setPlayers] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [group, setGroup] = useState("A");
  const [msg, setMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/state");
    if (r.status === 401) { setAuthed(false); return; }
    const d = await r.json();
    setAuthed(true);
    setJoinCode(d.settings.join_code);
    setLocked(d.settings.tournament_locked);
    setGoldenBoot(d.settings.golden_boot_result ?? "");
    setOddsLockedAt(d.settings.odds_locked_at);
    setPlayers(d.players);
    setMatches(d.matches);
    setTeams(d.teams);
  }
  useEffect(() => { load(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    if (!r.ok) { setLoginErr((await r.json()).error ?? "Wrong password."); return; }
    load();
  }

  async function post(url: string, body: object, label: string) {
    setMsg(`${label}…`);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error ?? "Error"); return; }
    if (url.endsWith("refresh-odds")) setMsg(d.note ? d.note : `Odds locked: ${d.matches} matches, ${d.teams} teams ✓`);
    else if (url.endsWith("import-results")) setMsg(`Imported ${d.updated} score(s), ${d.teamsUpdated} team update(s) ✓`);
    else setMsg("Saved ✓");
    load();
  }

  if (authed === null) return <p className="text-slate-500">Loading…</p>;
  if (!authed) {
    return (
      <form onSubmit={login} className="max-w-sm mx-auto mt-10 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Admin access</h1>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password" className="w-full border border-slate-300 rounded-lg px-3 py-2" autoFocus />
        {loginErr && <p className="text-red-600 text-sm">{loginErr}</p>}
        <button className="w-full bg-pitch text-white rounded-lg px-4 py-2 font-semibold hover:bg-pitch-dark">Enter</button>
      </form>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin · {players} player{players === 1 ? "" : "s"}</h1>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold mb-3">Odds &amp; settings</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Join code</label>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            Lock picks (tournament started)
          </label>
          <button onClick={() => post("/api/admin/settings", { join_code: joinCode, tournament_locked: locked }, "Saving")}
            className="bg-pitch text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-pitch-dark">Save settings</button>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
          <button onClick={() => post("/api/admin/refresh-odds", {}, "Locking odds")}
            className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-700">
            🔒 Lock odds (one-time)
          </button>
          <span className="text-xs text-slate-500">
            {oddsLockedAt ? `Odds locked ${new Date(oddsLockedAt).toLocaleString()}` : "Odds not locked yet — do this before sharing."}
          </span>
          <button onClick={() => post("/api/admin/import-results", {}, "Importing")}
            className="bg-slate-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-300">🤖 Import results now</button>
        </div>
        {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold mb-3">👟 Golden Boot result</h2>
        <div className="flex items-center gap-3">
          <input value={goldenBoot} onChange={(e) => setGoldenBoot(e.target.value)} placeholder="Top scorer's name"
            className="border border-slate-300 rounded-lg px-3 py-2 w-64" />
          <button onClick={() => post("/api/admin/settings", { golden_boot_result: goldenBoot }, "Saving")}
            className="bg-pitch text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-pitch-dark">Save</button>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Group results</h2>
          <select value={group} onChange={(e) => setGroup(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {GROUPS.map((g) => <option key={g} value={g}>Group {g}</option>)}
          </select>
        </div>
        <div className="grid gap-2">
          {matches.filter((m) => m.group_label === group).map((m) => <AdminResultRow key={m.id} match={m} />)}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-1">Team progress (knockout ride scoring)</h2>
        <p className="text-xs text-slate-500 mb-3">Set how far each team got. The importer fills this in automatically; override here if needed. Number = the team&apos;s value.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {teams.map((t) => <AdminTeamRow key={t.name} team={t} />)}
        </div>
      </section>
    </div>
  );
}
