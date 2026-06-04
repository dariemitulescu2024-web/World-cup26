"use client";
import { useEffect, useState } from "react";
import { ALL_TEAMS } from "@/lib/teams";
import { Match, Stage, STAGE_LABELS } from "@/lib/types";
import AdminResultRow from "./AdminResultRow";

const STAGES: Stage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [locked, setLocked] = useState(false);
  const [players, setPlayers] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stage, setStage] = useState<Stage>("group");
  const [oddsMsg, setOddsMsg] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const [importing, setImporting] = useState(false);

  // bonus results
  const [champion, setChampion] = useState("");
  const [goldenBoot, setGoldenBoot] = useState("");
  const [semis, setSemis] = useState<string[]>(["", "", "", ""]);
  const [bonusMsg, setBonusMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/state");
    if (r.status === 401) {
      setAuthed(false);
      return;
    }
    const d = await r.json();
    setAuthed(true);
    setJoinCode(d.settings.join_code);
    setLocked(d.settings.tournament_locked);
    setPlayers(d.players);
    setMatches(d.matches);
    const br = d.settings.bonus_results ?? {};
    setChampion(br.champion ?? "");
    setGoldenBoot(br.golden_boot ?? "");
    setSemis([br.semifinalists?.[0] ?? "", br.semifinalists?.[1] ?? "", br.semifinalists?.[2] ?? "", br.semifinalists?.[3] ?? ""]);
  }

  useEffect(() => {
    load();
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) {
      const d = await r.json();
      setLoginErr(d.error ?? "Wrong password.");
      return;
    }
    load();
  }

  async function saveSettings() {
    setSettingsMsg("");
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_code: joinCode, tournament_locked: locked }),
    });
    const d = await r.json();
    setSettingsMsg(r.ok ? "Saved ✓" : d.error ?? "Error");
  }

  async function saveBonus() {
    setBonusMsg("");
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bonus_results: { champion, golden_boot: goldenBoot, semifinalists: semis.filter(Boolean) },
      }),
    });
    const d = await r.json();
    setBonusMsg(r.ok ? "Saved & leaderboard recomputed ✓" : d.error ?? "Error");
  }

  async function refreshOdds() {
    setOddsMsg("Fetching…");
    const r = await fetch("/api/admin/refresh-odds", { method: "POST" });
    const d = await r.json();
    setOddsMsg(d.note ? d.note : `Updated odds on ${d.updated} matches ✓`);
  }

  async function importNow() {
    setImporting(true);
    setImportMsg("Checking for finished matches…");
    const r = await fetch("/api/admin/import-results", { method: "POST" });
    const d = await r.json();
    setImporting(false);
    if (!r.ok) {
      setImportMsg(d.error ?? "Import failed.");
      return;
    }
    setImportMsg(
      d.updated > 0
        ? `Imported ${d.updated} result${d.updated === 1 ? "" : "s"} ✓ (checked ${d.checked})`
        : `No new finished matches to import (checked ${d.checked}).`,
    );
    if (d.updated > 0) load();
  }

  if (authed === null) return <p className="text-slate-500">Loading…</p>;

  if (!authed) {
    return (
      <form onSubmit={login} className="max-w-sm mx-auto mt-10 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-bold">Admin access</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full border border-slate-300 rounded-lg px-3 py-2"
          autoFocus
        />
        {loginErr && <p className="text-red-600 text-sm">{loginErr}</p>}
        <button className="w-full bg-pitch text-white rounded-lg px-4 py-2 font-semibold hover:bg-pitch-dark">
          Enter
        </button>
      </form>
    );
  }

  const teamOptions = (
    <>
      <option value="">— team —</option>
      {ALL_TEAMS.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </>
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin · {players} player{players === 1 ? "" : "s"}</h1>

      {/* Pool settings */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold mb-3">Pool settings</h2>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Join code</label>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            Lock bonus picks (tournament started)
          </label>
          <button onClick={saveSettings} className="bg-pitch text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-pitch-dark">
            Save settings
          </button>
          <button onClick={refreshOdds} className="bg-slate-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-300">
            🔄 Refresh odds
          </button>
          <button onClick={importNow} disabled={importing} className="bg-slate-200 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-slate-300 disabled:opacity-60">
            🤖 Import results now
          </button>
          <span className="text-xs text-slate-500 pb-2">{settingsMsg} {oddsMsg}</span>
        </div>
        {importMsg && <p className="text-xs text-slate-500 mt-2">{importMsg}</p>}
      </section>

      {/* Bonus results */}
      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="font-bold mb-3">Tournament results (bonus scoring)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">🏆 Champion</label>
            <select value={champion} onChange={(e) => setChampion(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2">{teamOptions}</select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">👟 Golden Boot</label>
            <input value={goldenBoot} onChange={(e) => setGoldenBoot(e.target.value)}
              placeholder="Player name" className="w-full border border-slate-300 rounded-lg px-3 py-2" />
          </div>
          {semis.map((s, i) => (
            <div key={i}>
              <label className="block text-xs text-slate-500 mb-1">🥇 Semi-finalist {i + 1}</label>
              <select value={s} onChange={(e) => setSemis((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2">{teamOptions}</select>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={saveBonus} className="bg-pitch text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-pitch-dark">
            Save results
          </button>
          <span className="text-xs text-slate-500">{bonusMsg}</span>
        </div>
      </section>

      {/* Match results */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Enter match results</h2>
          <select value={stage} onChange={(e) => setStage(e.target.value as Stage)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
            {STAGES.map((s) => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          {matches.filter((m) => m.stage === stage).map((m) => (
            <AdminResultRow key={m.id} match={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
