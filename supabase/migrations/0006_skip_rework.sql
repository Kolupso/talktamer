-- TalkTamer — Phase 7 follow-up: rule-3 (skip) rework.
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run once.
-- (Ignore the "destructive operations" warning — it only defines a function and
--  adjusts a constraint/index.)

-- ---------------------------------------------------------------------------
-- 1. Allow a speaker to be re-added while an old SKIPPED row of theirs remains.
--    Replace the full unique(debate_id, speaker_id) constraint with a PARTIAL
--    unique index that only applies to active (non-skipped) rows. Result:
--    at most one active row per speaker, but any number of skipped rows.
-- ---------------------------------------------------------------------------
alter table waiting_list
  drop constraint if exists waiting_list_debate_id_speaker_id_key;

create unique index if not exists waiting_list_active_unique
  on waiting_list (debate_id, speaker_id)
  where not skipped;

-- ---------------------------------------------------------------------------
-- 2. advance_speaker: skipped speakers ahead of the next real speaker have had
--    their turn — drop them (logged as removed) before advancing.
-- ---------------------------------------------------------------------------
create or replace function advance_speaker(p_debate_id bigint)
returns void
language plpgsql
as $$
declare
  ts       timer_state%rowtype;
  elapsed  numeric;
  cur_name text;
  cur_gen  gender;
  nxt      record;
begin
  select * into ts from timer_state where debate_id = p_debate_id for update;
  if not found then
    raise exception 'No timer_state for debate %', p_debate_id;
  end if;

  -- 1. Finalise the outgoing speaker, if any.
  if ts.current_speaker_id is not null then
    elapsed := ts.accumulated_seconds
             + case when ts.status = 'running' and ts.started_at is not null
                    then extract(epoch from (now() - ts.started_at))
                    else 0 end;

    select name, gender into cur_name, cur_gen
      from speakers where id = ts.current_speaker_id;

    insert into speech_log (
      debate_id, speaker_id, speaker_name, speaker_gender,
      was_first_time, allotted_seconds, spoke_seconds, removed
    ) values (
      p_debate_id, ts.current_speaker_id,
      coalesce(cur_name, '(deleted speaker)'), coalesce(cur_gen, 'man'),
      coalesce(ts.current_is_first_time, false),
      ts.duration_seconds, round(elapsed), false
    );

    update debate_participation
      set speak_count = speak_count + 1
      where debate_id = p_debate_id and speaker_id = ts.current_speaker_id;
  end if;

  -- 2. Pick the next waiting speaker: top NON-skipped by position.
  select wl.id as wl_id, wl.speaker_id, wl.position,
         coalesce(dp.speak_count, 0) as speak_count
    into nxt
    from waiting_list wl
    left join debate_participation dp
      on dp.debate_id = wl.debate_id and dp.speaker_id = wl.speaker_id
    where wl.debate_id = p_debate_id and wl.skipped = false
    order by wl.position asc
    limit 1;

  -- 3a. No one left to speak → clear the current speaker. Any skipped rows stay
  --     (their turn only passes once a real speaker is called past them).
  if nxt.wl_id is null then
    update timer_state
      set current_speaker_id = null, current_is_first_time = null,
          duration_seconds = 0, status = 'idle',
          started_at = null, accumulated_seconds = 0
      where debate_id = p_debate_id;
    return;
  end if;

  -- 3b. Log every skipped speaker ahead of the chosen one as removed (turn passed).
  --     All rows with position < nxt.position are skipped (nxt is the first
  --     non-skipped by position).
  insert into speech_log (
    debate_id, speaker_id, speaker_name, speaker_gender,
    was_first_time, allotted_seconds, spoke_seconds, removed
  )
  select p_debate_id, wl.speaker_id,
         coalesce(s.name, '(deleted speaker)'), coalesce(s.gender, 'man'),
         coalesce(dp.speak_count, 0) = 0, 0, 0, true
    from waiting_list wl
    left join speakers s on s.id = wl.speaker_id
    left join debate_participation dp
      on dp.debate_id = wl.debate_id and dp.speaker_id = wl.speaker_id
    where wl.debate_id = p_debate_id and wl.position < nxt.position;

  -- 3c. Remove the chosen speaker AND the leading skipped ones; close the gap.
  delete from waiting_list
    where debate_id = p_debate_id and position <= nxt.position;
  update waiting_list
    set position = position - nxt.position
    where debate_id = p_debate_id and position > nxt.position;

  -- 3d. Load the chosen speaker as current.
  update timer_state
    set current_speaker_id = nxt.speaker_id,
        current_is_first_time = (nxt.speak_count = 0),
        duration_seconds = case when nxt.speak_count = 0
                                then d.first_time_seconds
                                else d.multi_time_seconds end,
        status = 'idle', started_at = null, accumulated_seconds = 0
    from debates d
    where timer_state.debate_id = p_debate_id and d.id = p_debate_id;
end;
$$;
