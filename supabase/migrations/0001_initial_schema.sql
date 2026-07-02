-- TalkTamer — initial schema (Phase 2)
-- Run this in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It is safe to run once on a fresh project.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type gender as enum ('man', 'woman', 'enby');
create type timer_status as enum ('idle', 'running', 'paused', 'finished');

-- ---------------------------------------------------------------------------
-- Speakers — the global register (independent of any debate)
-- ---------------------------------------------------------------------------
create table speakers (
  id         bigint generated always as identity primary key,
  name       text not null,
  gender     gender not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Debates — one active at a time; per-debate settings inlined
-- ---------------------------------------------------------------------------
create table debates (
  id         bigint generated always as identity primary key,
  name       text not null,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),

  -- Speaking times (seconds)
  first_time_seconds int not null default 120,
  multi_time_seconds int not null default 60,

  -- Countdown colour thresholds (seconds remaining)
  yellow_threshold_seconds int not null default 30,
  red_threshold_seconds    int not null default 10,
  show_color_indicators    boolean not null default true,  -- page 3 yellow/red on/off

  -- Special rules
  rule1_enabled boolean not null default false,  -- first-time speakers before multiple-time
  rule2_enabled boolean not null default false,  -- zebra striping (alternate woman/enby)
  rule3_enabled boolean not null default false,  -- removed speakers stay visible but skipped

  -- Display toggles
  list_closed               boolean not null default false, -- "no more sign-ups" icon
  show_gender_indicators    boolean not null default true,  -- page 2 gender indicators
  show_countdown_on_waiting boolean not null default false  -- page 2 countdown on/off
);

-- At most one debate may be active at any time.
create unique index one_active_debate on debates (is_active) where is_active;

-- ---------------------------------------------------------------------------
-- Debate participation — per (debate, speaker) speak count
--   speak_count = 0  -> first-time speaker (next speech is their first)
--   speak_count > 0  -> multiple-time speaker
-- ---------------------------------------------------------------------------
create table debate_participation (
  id          bigint generated always as identity primary key,
  debate_id   bigint not null references debates (id) on delete cascade,
  speaker_id  bigint not null references speakers (id) on delete cascade,
  speak_count int not null default 0,
  unique (debate_id, speaker_id)
);

-- ---------------------------------------------------------------------------
-- Waiting list — the queue for a debate
-- ---------------------------------------------------------------------------
create table waiting_list (
  id         bigint generated always as identity primary key,
  debate_id  bigint not null references debates (id) on delete cascade,
  speaker_id bigint not null references speakers (id) on delete cascade,
  entered_at timestamptz not null default now(),  -- base ordering key
  locked     boolean not null default false,      -- pinned to position 1 or 2
  skipped    boolean not null default false,      -- rule 3: visible but skipped
  unique (debate_id, speaker_id)
);

-- ---------------------------------------------------------------------------
-- Timer state — current speaker + countdown, one row per debate.
-- Stored as STATE, not ticks: remaining seconds are computed by each client as
--   duration_seconds - accumulated_seconds
--     - (status = 'running' ? now() - started_at : 0)
-- ---------------------------------------------------------------------------
create table timer_state (
  debate_id           bigint primary key references debates (id) on delete cascade,
  current_speaker_id  bigint references speakers (id) on delete set null,
  current_is_first_time boolean,
  duration_seconds    int not null default 0,
  status              timer_status not null default 'idle',
  started_at          timestamptz,                 -- start of the current running segment
  accumulated_seconds numeric not null default 0   -- elapsed banked before current segment
);

-- ---------------------------------------------------------------------------
-- Speech log — statistics. One row per speech event.
-- Speaker name/gender are snapshotted so the log survives later register edits.
-- ---------------------------------------------------------------------------
create table speech_log (
  id              bigint generated always as identity primary key,
  debate_id       bigint not null references debates (id) on delete cascade,
  speaker_id      bigint references speakers (id) on delete set null,
  speaker_name    text not null,      -- snapshot
  speaker_gender  gender not null,    -- snapshot
  was_first_time  boolean not null,
  allotted_seconds int not null default 0,
  spoke_seconds   numeric not null default 0,
  removed         boolean not null default false, -- removed from waiting list, did not speak
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------
create index on debate_participation (debate_id);
create index on waiting_list (debate_id);
create index on speech_log (debate_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every authenticated user (a manager) has full access.
-- ---------------------------------------------------------------------------
alter table speakers             enable row level security;
alter table debates              enable row level security;
alter table debate_participation enable row level security;
alter table waiting_list         enable row level security;
alter table timer_state          enable row level security;
alter table speech_log           enable row level security;

create policy "authenticated full access" on speakers
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on debates
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on debate_participation
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on waiting_list
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on timer_state
  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on speech_log
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime — broadcast row changes to subscribed display windows.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table debates;
alter publication supabase_realtime add table waiting_list;
alter publication supabase_realtime add table debate_participation;
alter publication supabase_realtime add table timer_state;
