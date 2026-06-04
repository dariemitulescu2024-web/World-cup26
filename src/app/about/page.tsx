import { CrownMark } from "../Logo";

export const metadata = { title: "About · Imperial Capital World Cup Pool" };

export default function AboutPage() {
  return (
    <div className="max-w-lg mx-auto text-center mt-6">
      <CrownMark className="h-12 w-auto mx-auto text-pitch mb-3" />
      <p className="tracking-[0.25em] text-pitch font-semibold text-sm">IMPERIAL CAPITAL</p>
      <h1 className="text-2xl font-bold mt-2 mb-4">World Cup 2026 Pool</h1>

      <div className="bg-white border border-slate-200 rounded-xl p-6 text-left space-y-4">
        <div>
          <h2 className="font-bold text-lg">Built by</h2>
          <p className="text-slate-700 mt-1">
            <b>Darie Mitulescu</b> &amp; <b>Yadhu</b> — Imperial Capital interns, 2026.
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Made for the office sweepstake. Predict every group game, ride your favourite teams
            through the knockouts, and climb the leaderboard.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-bold">How scoring works</h2>
          <ul className="text-sm text-slate-600 mt-1 space-y-1 list-disc list-inside">
            <li>Group games: pick W/D/L — points = a base + the (frozen) odds value, so underdogs pay more.</li>
            <li>Up to 3 ⭐ wildcards worth 5× on games you&apos;re sure of.</li>
            <li>Knockouts: a champion, a Golden Boot, and 3 teams ridden by how far they go.</li>
            <li>Odds are locked once and never change during the tournament.</li>
          </ul>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h2 className="font-bold">Under the hood</h2>
          <p className="text-sm text-slate-600 mt-1">
            Next.js + Tailwind on Vercel, Supabase (Postgres). Live odds from The Odds API;
            results &amp; team progress auto-imported via Google&apos;s Gemini with Search grounding.
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6">⚽ May the best forecaster win.</p>
    </div>
  );
}
