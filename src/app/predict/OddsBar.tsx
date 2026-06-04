"use client";

// Three-segment W/D/L probability bar. A guide for people who don't follow
// the teams — derived from de-vigged bookmaker odds.
export default function OddsBar({
  home,
  draw,
  away,
  homeTeam,
  awayTeam,
}: {
  home: number | null;
  draw: number | null;
  away: number | null;
  homeTeam: string;
  awayTeam: string;
}) {
  if (home == null || draw == null || away == null) {
    return <p className="text-xs text-slate-400 italic">Odds guide unavailable yet</p>;
  }
  const pct = (n: number) => Math.round(n * 100);
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden">
        <div className="bg-sky-500" style={{ width: `${pct(home)}%` }} title={`${homeTeam} win`} />
        <div className="bg-slate-300" style={{ width: `${pct(draw)}%` }} title="Draw" />
        <div className="bg-rose-500" style={{ width: `${pct(away)}%` }} title={`${awayTeam} win`} />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
        <span>{homeTeam} {pct(home)}%</span>
        <span>Draw {pct(draw)}%</span>
        <span>{pct(away)}% {awayTeam}</span>
      </div>
    </div>
  );
}
