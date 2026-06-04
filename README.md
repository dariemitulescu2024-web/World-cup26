# 🏆 Office World Cup 2026 Pool

A prediction pool for the 2026 FIFA World Cup. Players predict every match
scoreline plus bonuses, play wildcards, and climb a live leaderboard. Built with
Next.js 16 + Tailwind, backed by Supabase (Postgres), deploys free on Vercel.

- **Join** with a name + a shared office code (no passwords for players).
- **Predict** every match: scoreline, first goalscorer, first team to score.
- **Wildcards:** 3 group-stage "doubles" (2× a match) + 2 knockout "boosters" (3× a first-scorer call).
- **Bonus picks:** champion, Golden Boot, four semi-finalists.
- **Odds bar:** a de-vigged W/D/L probability guide per match (optional, via The Odds API).
- **Admin page** to enter results, fill knockout teams, edit fixtures, and manage settings.

---

## Scoring

**Per match — base (tiered, you get the single best one):**

| Outcome | Points |
|---|---|
| Exact scoreline | **5** |
| Correct result **+** one team's exact goals | **3** |
| Correct result only (W/D/L) | **2** |
| Wrong result but one team's exact goals | **1** |

**Per-match bonus (added on top):** first team to score **+1**.

**Knockouts:** the exact-score and one-team tiers are judged on the **90-minute**
score, but the win/draw/loss **result follows whoever advances** (extra time /
penalties count) — a predicted draw earns no result points. The whole match total
is then multiplied by the round — R32 ×1, R16 ×2, QF ×3, SF ×4, Final ×5 (3rd-place ×2).

**Wildcards:** group "double" = 2× the match (group games only). No knockout wildcards.

**Bonus picks (pre-tournament long-shots, weighted to matter):** champion **+75**,
Golden Boot **+25**, **+10 per correct semi-finalist** (up to +40).

The tiers are strictly ordered by correctness and don't stack, so there's no
loophole (e.g. spamming 0–0 caps at the 1-pt consolation tier). See
`src/lib/scoring.ts` and the tests in `src/lib/scoring.test.ts` (`npm test`).

---

## Setup

### 1. Create a Supabase project (free)
1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a name and a strong database password.
2. Once it's ready, open **SQL Editor → New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**.
3. Grab your credentials:
   - **Project URL:** Settings → Data API → Project URL.
   - **Service role key:** Settings → API Keys → `service_role` (secret).

### 2. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, a strong `ADMIN_PASSWORD`,
and a random `SESSION_SECRET`. `ODDS_API_KEY` is optional (see below).

### 3. Seed the fixtures
Loads settings + all 104 matches (72 group from the real Dec 2025 draw + 32 knockout placeholders):
```bash
npm run seed
```
Re-running is safe — it upserts.

### 4. Run locally
```bash
npm install   # if you haven't
npm run dev    # http://localhost:3000
```
Open the site, click **Create account**, and register with a name + 4-digit PIN +
the join code (default **`WORLDCUP26`**). Then click around. Visit `/admin` and log
in with your `ADMIN_PASSWORD` to enter results.

---

## Deploy to Vercel (free)
1. Push this folder to a GitHub repo.
2. At [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Under **Environment Variables**, add the same keys from your `.env.local`
   (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`,
   and optionally `ODDS_API_KEY`).
4. Click **Deploy**. Share the resulting URL + the join code with the office.

> The seed/schema steps run against Supabase, so you only do them once (locally or
> from the Supabase dashboard) — not per deploy.

---

## The odds bar (optional)
1. Get a free key at [the-odds-api.com](https://the-odds-api.com) (500 requests/month).
2. Set `ODDS_API_KEY` in `.env.local` and in Vercel.
3. In `/admin`, click **🔄 Refresh odds**. It pulls bookmaker h2h odds, removes the
   margin, and caches a clean W/D/L % per match. Without a key, the bar is simply hidden.

Re-click occasionally as odds move (the free tier is limited, so don't automate it tightly).

---

## Running the tournament (admin checklist)
- **Before kickoff:** set the join code, share it. Players make match + bonus picks.
- **When the tournament starts:** tick **"Lock bonus picks"** in admin (also auto-locks at first kickoff).
- **As groups finish:** in admin, edit the knockout fixtures (amber-highlighted
  placeholders like `R32 1A`) to the real teams and confirm kickoff times.
- **Match results:** these import **automatically** (see below). You only need to
  manually enter/correct a result in `/admin` if the importer missed or got a detail
  wrong. Points recompute instantly whenever a result lands.
- **At the end:** fill in **Tournament results** (champion, Golden Boot, semi-finalists)
  to award the bonus points.

---

## Automatic results importer
Finished match results are pulled in automatically using **Gemini + Google Search
grounding** (`src/lib/importResults.ts`):
- A **daily Vercel cron** (`vercel.json`, 09:00 UTC) hits `/api/cron/import-results`
  and fills in any newly-finished matches — scoreline, first team to score, and
  first goalscorer — then recomputes the leaderboard.
- An **"Import results now"** button in `/admin` runs it on demand.
- It only touches matches you haven't already entered, and **never overwrites a
  manual result** — so your corrections always win.
- It's an LLM reading the web: scorelines are very reliable, finer details
  (first scorer) are usually right but worth a glance. Anything it can't confirm it
  leaves blank rather than guessing, and it won't fill an unplayed match.
- Needs `GEMINI_API_KEY` (free, [aistudio.google.com/apikey](https://aistudio.google.com/apikey))
  and `CRON_SECRET`. Without them, the importer is disabled and you enter results manually.
- For knockouts: fill in the real teams in `/admin` once groups finish; the importer
  then picks those matches up automatically too.

> Cron note: Vercel's Hobby plan runs crons ~once per day. If you want more frequent
> updates on match days, use the "Import results now" button, or point a free
> external scheduler (e.g. cron-job.org) at `/api/cron/import-results` with the
> `Authorization: Bearer <CRON_SECRET>` header.

## Notes & trade-offs
- **Login is name + a personal 4-digit PIN.** PINs are salted + hashed with
  `SESSION_SECRET` (never stored raw). The join code is required only to *create* an
  account, so strangers can't register on the public URL. A 4-digit PIN is fine for a
  friendly office pool, not bank-grade — don't reuse a sensitive PIN.
- **Kickoff times are seeded approximately** within the correct match windows and are
  fully editable in admin — set the exact times you care about before locking matters.
- **Knockout teams are placeholders** until you fill them in once groups conclude.
- **First goalscorer** is matched leniently (case/accents ignored). Own goals don't
  win the first-scorer bonus but do count for "first team to score"; 0–0 = "none".

Built to be edited — scoring numbers live in `src/lib/types.ts` (`DEFAULT_SCORING`)
and the live config in the `settings` table.
