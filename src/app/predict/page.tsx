"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Prediction } from "@/lib/types";
import MatchCard, { UiMatch } from "./MatchCard";

interface Data {
  player: { id: string; name: string };
  matches: UiMatch[];
  predictions: Record<string, Prediction>;
}

export default function PredictPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [preds, setPreds] = useState<Record<string, Prediction>>({});
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/predict-data")
      .then(async (r) => {
        if (r.status === 401) { router.push("/"); return null; }
        return r.json();
      })
      .then((d: Data | null) => { if (!d) return; setData(d); setPreds(d.predictions); })
      .catch(() => setErr("Could not load matches."));
  }, [router]);

  const picked = useMemo(() => Object.keys(preds).length, [preds]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading matches…</p>;

  const oddsLocked = data.matches.some((m) => m.pts_home != null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-2xl font-bold">Group stage — pick a winner</h1>
        <span className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
          <b>{picked}</b> / {data.matches.length} picked
        </span>
      </div>

      <p className="text-sm text-slate-500 mb-2">
        Tap <b>Home / Draw / Away</b> for each match — it saves instantly. Points if correct =
        the value on the button (longer odds = more points). Picks lock at kickoff.
      </p>
      <p className="text-sm text-slate-500 mb-5">
        Don&apos;t forget your <Link href="/bonus" className="text-pitch font-semibold underline">knockout picks</Link> —
        champion, Golden Boot, and 3 teams to ride to the final.
      </p>

      {!oddsLocked && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm mb-4">
          Point values aren&apos;t locked yet — the organizer needs to lock the odds. You can still pick;
          values will appear once locked.
        </div>
      )}

      <div className="grid gap-2">
        {data.matches.map((m) => (
          <MatchCard
            key={m.id}
            match={m}
            pred={preds[m.id]}
            onSaved={(p) => setPreds((prev) => ({ ...prev, [m.id]: p }))}
          />
        ))}
      </div>
    </div>
  );
}
