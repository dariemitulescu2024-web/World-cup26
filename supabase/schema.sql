-- World Cup prediction pool schema (v2 — odds-based scoring).
-- Fresh install: run this once in the Supabase SQL editor.
-- Existing v1 database: run supabase/migrate-v2.sql instead.
-- All app access uses the service-role key, so RLS is on with NO policies.

create extension if not exists pgcrypto;

create table if not exists settings (
  id int primary key default 1,
  join_code text not null default 'WORLDCUP26',
  tournament_locked boolean not null default false,
  scoring jsonb not null,
  golden_boot_result text,
  odds_locked_at timestamptz,
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
  prob_home double precision,
  prob_draw double precision,
  prob_away double precision,
  pts_home int,
  pts_draw int,
  pts_away int,
  odds_updated_at timestamptz
);
create index if not exists matches_kickoff on matches (kickoff);

create table if not exists teams (
  name text primary key,
  champ_prob double precision,
  champ_base int not null default 0,
  furthest text not null default 'group',
  eliminated boolean not null default false
);

create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  match_id uuid not null references matches (id) on delete cascade,
  pick text not null,  -- 'home' | 'draw' | 'away'
  wildcard boolean not null default false,  -- 5× this game if correct (max 3 per player)
  points int not null default 0,
  updated_at timestamptz not null default now(),
  unique (player_id, match_id)
);
create index if not exists predictions_match on predictions (match_id);
create index if not exists predictions_player on predictions (player_id);

create table if not exists entries (
  player_id uuid primary key references players (id) on delete cascade,
  champion text,
  golden_boot text,
  ride_teams text[] not null default '{}',
  points int not null default 0,
  updated_at timestamptz not null default now()
);

alter table settings enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table teams enable row level security;
alter table predictions enable row level security;
alter table entries enable row level security;
