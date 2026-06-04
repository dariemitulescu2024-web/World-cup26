"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Prediction, ScoringConfig, Stage, STAGE_LABELS } from "@/lib/types";
import MatchCard, { UiMatch } from "./MatchCard";

const STAGE_ORDER: Stage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

interface Data {
  player: { id: string; name: string };
  matches: UiMatch[];
  predictions: Record<string, Prediction>;
  scoring: ScoringConfig;
  wildcards: { doublesUsed: number; doublesMax: number };
}

export default function PredictPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [preds, setPreds] = useState<Record<string, Prediction>>({});
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/predict-data")
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/");
          return null;
        }
        return r.json();
      })
      .then((d: Data | null) => {
        if (!d) return;
        setData(d);
        setPreds(d.predictions);
      })
      .catch(() => setErr("Could not load matches."));
  }, [router]);

  const stageById = useMemo(() => {
    const m: Record<string, Stage> = {};
    data?.matches.forEach((x) => (m[x.id] = x.stage));
    return m;
  }, [data]);

  const doublesUsed = useMemo(() => {
    let d = 0;
    for (const p of Object.values(preds)) {
      if (p.wildcard === "double" && stageById[p.match_id] === "group") d++;
    }
    return d;
  }, [preds, stageById]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!data) return <p className="text-slate-500">Loading matches…</p>;

  const doublesLeft = data.wildcards.doublesMax - doublesUsed;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl font-bold">Your predictions</h1>
        <div className="flex gap-2 text-sm">
          <span className="bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            🃏 Double wildcards: <b>{doublesLeft}</b> / {data.wildcards.doublesMax} left
          </span>
        </div>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Exact score <b>5</b> · right result <b>2</b> (+1 if you also nail one team&apos;s goals) ·
        first team to score <b>+1</b>. Knockouts scale ×1→×5 by round and the result follows who
        advances. Picks lock at kickoff.
      </p>

      {STAGE_ORDER.map((stage) => {
        const list = data.matches.filter((m) => m.stage === stage);
        if (list.length === 0) return null;
        return (
          <section key={stage} className="mb-8">
            <h2 className="text-lg font-bold text-pitch border-b border-slate-200 pb-1 mb-3">
              {STAGE_LABELS[stage]}
              {stage !== "group" && (
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ×{data.scoring.roundMultiplier[stage as Exclude<Stage, "group">]} points
                </span>
              )}
            </h2>
            <div className="grid gap-3">
              {list.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  pred={preds[m.id]}
                  doublesLeft={doublesLeft}
                  onSaved={(p) => setPreds((prev) => ({ ...prev, [m.id]: p }))}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
