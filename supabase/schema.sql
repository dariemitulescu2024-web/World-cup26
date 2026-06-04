-- World Cup prediction pool schema.
-- Run this once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- All app access goes through the service-role key on the server, so RLS is
-- enabled with NO policies: the public anon key can't read or write anything.

create extension if not exists pgcrypto;

create table if not exists settings (
  id int primary key default 1,
  join_code text not null default 'WORLDCUP26',
  tournament_locked boolean not null default false,
  scoring jsonb not null,
  bonus_results jsonb not null
    default '{"champion":null,"golden_boot":null,"semifinalists":[]}'::jsonb,
  constraint settings_singleton check (id = 1)
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text not null unique,
  pin_hash text,
  created_at timestamptz not null default now()
);
create unique index if not exists players_name_lower on players (lower(name));
-- For databases created before PIN logins were added:
alter table players add column if not exists pin_hash text;

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  match_no int not null unique,
  stage text not null,
  group_label text,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  venue text,
  finished boolean not null default false,
  home_goals int,
  away_goals int,
  first_team text,
  advancing text, -- knockout only: 'home' or 'away' (who advanced)
  prob_home double precision,
  prob_draw double precision,
  prob_away double precision,
  odds_updated_at timestamptz
);
create index if not exists matches_kickoff on matches (kickoff);
-- For databases created before knockout-advancement scoring was added:
alter table matches add column if not exists advancing text;

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  match_id uuid not null references matches (id) on delete cascade,
  pred_home int not null,
  pred_away int not null,
  pred_first_team text,
  wildcard text not null default 'none',
  points int not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id, match_id)
);
create index if not exists predictions_match on predictions (match_id);
create index if not exists predictions_player on predictions (player_id);

create table if not exists bonus_predictions (
  player_id uuid primary key references players (id) on delete cascade,
  champion text,
  golden_boot text,
  semifinalists text[] not null default '{}',
  points int not null default 0,
  updated_at timestamptz not null default now()
);

-- Lock everything down to the service role only.
alter table settings enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table predictions enable row level security;
alter table bonus_predictions enable row level security;
