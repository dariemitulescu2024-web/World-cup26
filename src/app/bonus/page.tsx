"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BonusPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [champion, setChampion] = useState("");
  const [goldenBoot, setGoldenBoot] = useState("");
  const [semis, setSemis] = useState<string[]>(["", "", "", ""]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/bonus")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setTeams(d.teams ?? []);
        setLocked(d.locked);
        setChampion(d.bonus?.champion ?? "");
        setGoldenBoot(d.bonus?.golden_boot ?? "");
        const s = d.bonus?.semifinalists ?? [];
        setSemis([s[0] ?? "", s[1] ?? "", s[2] ?? "", s[3] ?? ""]);
      })
      .finally(() => setLoaded(true));
  }, [router]);

  async function save() {
    setMsg(null);
    const res = await fetch("/api/bonus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        champion,
        golden_boot: goldenBoot,
        semifinalists: semis.filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg({ ok: false, text: data.error ?? "Could not save." });
      return;
    }
    setMsg({ ok: true, text: "Bonus picks saved ✓" });
  }

  const teamSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      disabled={locked}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100"
    >
      <option value="">— pick a team —</option>
      {teams.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );

  if (!loaded) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-1">Bonus picks</h1>
      <p className="text-sm text-slate-500 mb-5">
        Made once, before kickoff of the first match — your long-shot bets, weighted to matter.
        Champion <b>+75</b>, Golden Boot <b>+25</b>, each correct semi-finalist <b>+10</b> (up to +40).
      </p>

      {locked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm mb-4">
          🔒 The tournament has started — bonus picks are locked.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">🏆 Tournament winner (+75)</label>
          {teamSelect(champion, setChampion)}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">👟 Golden Boot — top scorer (+25)</label>
          <input
            value={goldenBoot}
            disabled={locked}
            onChange={(e) => setGoldenBoot(e.target.value)}
            placeholder="Player name"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 disabled:bg-slate-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">🥇 Four semi-finalists (+10 each correct)</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {semis.map((s, i) => (
              <div key={i}>
                {teamSelect(s, (v) => setSemis((prev) => prev.map((x, j) => (j === i ? v : x))))}
              </div>
            ))}
          </div>
        </div>
        {!locked && (
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              className="bg-pitch text-white rounded-lg px-5 py-2 font-semibold hover:bg-pitch-dark"
            >
              Save bonus picks
            </button>
            {msg && <span className={`text-sm ${msg.ok ? "text-pitch" : "text-red-600"}`}>{msg.text}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
