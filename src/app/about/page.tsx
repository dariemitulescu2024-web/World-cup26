import { CrownMark } from "../Logo";

export const metadata = { title: "About & Rules · Imperial Capital World Cup Pool" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-pitch font-bold shrink-0">{label}</span>
      <span className="text-slate-600">{children}</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-6">
      <div className="text-center">
        <CrownMark className="h-12 w-auto mx-auto text-pitch mb-3" />
        <p className="tracking-[0.25em] text-pitch font-semibold text-sm">IMPERIAL CAPITAL</p>
        <h1 className="text-2xl font-bold mt-2">World Cup 2026 Pool</h1>
        <p className="text-slate-500 text-sm mt-2">
          Built by <b>Darie &amp; Yadhu</b> — Imperial Capital interns, 2026.
        </p>
      </div>

      {/* GROUP STAGE */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-1">⚽ Group stage — pick a winner</h2>
        <p className="text-sm text-slate-600 mb-3">
          For each of the 72 group games, tap <b>Home win</b>, <b>Draw</b>, or <b>Away win</b>. Get it
          right and you score <b>3 + the odds value</b> of that outcome — the less likely it was, the
          more it&apos;s worth. Wrong = 0. Every button shows exactly what it pays. Picks lock at kickoff.
        </p>
        <div className="space-y-1.5 bg-slate-50 rounded-lg p-3">
          <Row label="Favorite">Pick Germany to beat Curaçao (93% likely) and they win → <b>4 pts</b>.</Row>
          <Row label="Coin-flip">A tight game you call right → about <b>5–6 pts</b>.</Row>
          <Row label="Upset">Call Curaçao to beat Germany and they do → <b>53 pts</b>. 🤯</Row>
        </div>
        <p className="text-sm text-slate-600 mt-3">
          So favorites are safe, steady points; underdogs are high-risk, high-reward. Both are valid
          ways to win.
        </p>
      </section>

      {/* WILDCARDS */}
      <section className="bg-white border border-amber-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-1">⭐ Wildcards (×5)</h2>
        <p className="text-sm text-slate-600 mb-3">
          You get <b>3 wildcards</b> for the whole group stage. After you pick a game, hit
          &ldquo;Make 5× wildcard&rdquo; to <b>quintuple</b> its points if you&apos;re right. Best spent on a
          confident underdog call.
        </p>
        <div className="space-y-1.5 bg-amber-50 rounded-lg p-3">
          <Row label="Big swing">That 53-pt Curaçao upset as a wildcard → <b>265 pts</b>.</Row>
          <Row label="Modest">A 4-pt favorite as a wildcard → <b>20 pts</b>.</Row>
        </div>
      </section>

      {/* KNOCKOUTS */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-1">🏆 Knockout picks</h2>
        <p className="text-sm text-slate-600 mb-3">
          Made once, before the tournament starts. Each team has a <b>value</b> = its title odds
          (favorites cheap, underdogs pricey, capped at 150).
        </p>
        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <b className="text-pitch">Champion</b> — pick who lifts the trophy. Correct →
            <b> 50 + the team&apos;s value</b>. <span className="text-slate-500">(France wins → 56; a 150-value
            outsider wins → 200.)</span>
          </p>
          <p>
            <b className="text-pitch">Golden Boot</b> — pick the top scorer. Correct → flat <b>30</b>.
          </p>
          <p>
            <b className="text-pitch">Ride 3 teams</b> — each scores <b>its value × how far it gets</b>:
          </p>
          <div className="bg-slate-50 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            <div>Round of 16<br /><b className="text-pitch">×1</b></div>
            <div>Quarter-final<br /><b className="text-pitch">×2</b></div>
            <div>Semi-final<br /><b className="text-pitch">×3</b></div>
            <div>Final<br /><b className="text-pitch">×4</b></div>
            <div>Champion<br /><b className="text-pitch">×5</b></div>
          </div>
          <div className="space-y-1.5 bg-slate-50 rounded-lg p-3">
            <Row label="Safe ride">Spain (value 6) reaches the semis → 6 × 3 = <b>18</b>; wins it all → <b>30</b>.</Row>
            <Row label="Moonshot">A 150-value minnow reaches the quarters → 150 × 2 = <b>300</b>.</Row>
            <Row label="Out early">A team knocked out before the Round of 16 → <b>0</b>.</Row>
            <Row label="Double-up">Ride France <i>and</i> name them champion; they win → 30 + 56 = <b>86</b>.</Row>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-1">
            <p className="text-sm text-slate-700">
              <b className="text-amber-700">💡 The points are in the underdogs.</b> Spain (value 6) tops
              out at <b>30</b> — and only if it wins it all. A 150-value dark horse banks <b>300</b> just
              for reaching the quarters. <b>Ride longshots that could go on a run, not safe favorites.</b>
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Still fair: win the title and every team&apos;s worth the same in expectation — the edge is
              in the earlier rounds, where a longshot&apos;s big value pays off for a likelier deep run.
            </p>
          </div>
        </div>
      </section>

      {/* LEADERBOARD + LOCKED ODDS */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="font-bold text-lg mb-1">📊 Leaderboard &amp; fair play</h2>
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
          <li><b>Points</b> = what you&apos;ve locked in so far.</li>
          <li><b>Max</b> = your ceiling if every remaining pick hits — a high Max means you&apos;re backing underdogs.</li>
          <li><b>Odds are frozen</b> at a single point in time and never change during the tournament, so everyone&apos;s picks are scored on the same numbers.</li>
        </ul>
      </section>

      <p className="text-center text-xs text-slate-400">
        Next.js + Supabase on Vercel · odds via The Odds API · results auto-imported with Gemini. ⚽
      </p>
    </div>
  );
}
