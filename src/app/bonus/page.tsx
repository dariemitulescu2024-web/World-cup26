"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

interface TeamOpt { name: string; champ_base: number }

export default function PicksPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [locked, setLocked] = useState(false);
  const [champion, setChampion] = useState("");
  const [goldenBoot, setGoldenBoot] = useState("");
  const [ride, setRide] = useState<string[]>(["", "", ""]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/entry")
      .then(async (r) => { if (r.status === 401) { router.push("/"); return null; } return r.json(); })
      .then((d) => {
        if (!d) return;
        setTeams(d.teams ?? []);
        setLocked(d.locked);
        setChampion(d.entry?.champion ?? "");
        setGoldenBoot(d.entry?.golden_boot ?? "");
        const rt = d.entry?.ride_teams ?? [];
        setRide([rt[0] ?? "", rt[1] ?? "", rt[2] ?? ""]);
      })
      .finally(() => setLoaded(true));
  }, [router]);

  const baseOf = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of teams) m[t.name] = t.champ_base;
    return m;
  }, [teams]);

  async function save() {
    setMsg(null);
    const res = await fetch("/api/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ champion, golden_boot: goldenBoot, ride_teams: ride.filter(Boolean) }),
    });
    const d = await res.json();
    setMsg(res.ok ? { ok: true, text: "Saved ✓" } : { ok: false, text: d.error ?? "Could not save." });
  }

  const teamSelect = (value: string, onChange: (v: string) => void) => (
    <select value={value} disabled={locked} onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100">
      <option value="">— pick a team —</option>
      {teams.map((t) => (
        <option key={t.name} value={t.name}>{t.name} — {t.champ_base} pts</option>
      ))}
    </select>
  );

  if (!loaded) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Knockout &amp; bonus picks</h1>
      <p className="text-sm text-slate-500 mb-5">
        Made once, locked at the first kickoff. Each team&apos;s value is the inverse of its title odds —
        underdogs are worth far more.
      </p>

      {locked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm mb-4">
          🔒 The tournament has started — picks are locked.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">🏆 Champion</label>
          <p className="text-xs text-slate-500 mb-2">If your pick wins it all, you score its full value{champion && baseOf[champion] != null ? ` (${baseOf[champion]} pts)` : ""}.</p>
          {teamSelect(champion, setChampion)}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">👟 Golden Boot — top scorer (+30)</label>
          <input value={goldenBoot} disabled={locked} onChange={(e) => setGoldenBoot(e.target.value)}
            placeholder="Player name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">🎟️ Ride 3 teams to the final</label>
          <p className="text-xs text-slate-500 mb-2">
            Each scores its value × how far it gets: Round of 16 ×1, QF ×2, SF ×3, Final ×4, Champion ×5.
            (You can pick your champion here too.)
          </p>
          <div className="space-y-2">
            {ride.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                {teamSelect(r, (v) => setRide((prev) => prev.map((x, j) => (j === i ? v : x))))}
                {r && baseOf[r] != null && (
                  <span className="text-xs text-slate-500 whitespace-nowrap">up to {baseOf[r] * 5}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!locked && (
          <div className="flex items-center gap-3">
            <button onClick={save} className="bg-pitch text-white rounded-lg px-5 py-2 font-semibold hover:bg-pitch-dark">
              Save picks
            </button>
            {msg && <span className={`text-sm ${msg.ok ? "text-pitch" : "text-red-600"}`}>{msg.text}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
