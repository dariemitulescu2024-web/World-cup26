-- Migrate the pool to v2 (odds-based scoring). Run once in the Supabase SQL editor.
-- The pool has no real players yet, so prediction/entry tables are recreated.

-- Group-fixture locked point values (round(1/prob))
alter table matches add column if not exists pts_home int;
alter table matches add column if not exists pts_draw int;
alter table matches add column if not exists pts_away int;

-- Golden Boot result + odds-lock timestamp
alter table settings add column if not exists golden_boot_result text;
alter table settings add column if not exists odds_locked_at timestamptz;

-- Replace the scoring config with the v2 (odds-based) shape
update settings set scoring = '{
  "groupMinPoints": 1,
  "rideMultiplier": {"group":0,"r32":0,"r16":1,"qf":2,"sf":3,"final":4,"champion":5},
  "rideTeams": 3,
  "goldenBoot": 30
}'::jsonb where id = 1;

-- Teams: championship value (locked) + knockout progress
create table if not exists teams (
  name text primary key,
  champ_prob double precision,
  champ_base int not null default 0,
  furthest text not null default 'group',  -- group|r32|r16|qf|sf|final|champion
  eliminated boolean not null default false
);
alter table teams enable row level security;

-- Predictions: one W/D/L pick per match
drop table if exists predictions cascade;
create table predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  match_id uuid not null references matches (id) on delete cascade,
  pick text not null,  -- 'home' | 'draw' | 'away'
  points int not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id, match_id)
);
create index if not exists predictions_match on predictions (match_id);
create index if not exists predictions_player on predictions (player_id);
alter table predictions enable row level security;

-- Pre-tournament entries: champion / golden boot / 3 ride teams
drop table if exists bonus_predictions cascade;
create table if not exists entries (
  player_id uuid primary key references players (id) on delete cascade,
  champion text,
  golden_boot text,
  ride_teams text[] not null default '{}',
  points int not null default 0,
  updated_at timestamptz not null default now()
);
alter table entries enable row level security;
